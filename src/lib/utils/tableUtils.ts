import { RefObject } from "react";

/**
 * Gets an element from a string ID or a React RefObject.
 */
const getElement = (target: string | RefObject<HTMLElement>): HTMLElement | null => {
 if (typeof target === "string") {
  return document.getElementById(target);
 }
 return target.current;
};

/**
 * Prints a table.
 * @param target The ID of the HTML table element or a React Ref.
 */
export const printTable = (target: string | RefObject<HTMLElement>) => {
 const element = getElement(target);
 if (!element) return;

 const printWindow = window.open("", "_blank");
 if (!printWindow) return;

 printWindow.document.write(`
  <html>
   <head>
    <title>Print Table</title>
    <style>
     table { border-collapse: collapse; width: 100%; }
     th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
     th { background-color: #f2f2f2; }
    </style>
   </head>
   <body>
    ${element.outerHTML}
   </body>
  </html>
 `);
 printWindow.document.close();
 printWindow.print();
};

/**
 * Exports data to Excel (CSV format).
 * @param data The data array OR a table element/ref.
 * @param fileName Optional filename.
 */
export const exportToExcel = (data: any[] | string | RefObject<HTMLElement>, fileName: string = "export") => {
 let rows_data: any[] = [];

 if (Array.isArray(data)) {
  rows_data = data;
 } else {
  const element = getElement(data);
  if (element && element instanceof HTMLTableElement) {
   // Extract data from table
   const rows = Array.from(element.querySelectorAll("tr"));
   rows_data = rows.map(row => {
    const cells = Array.from(row.querySelectorAll("th, td"));
    return cells.reduce((acc: any, cell, i) => {
     acc[`column${i}`] = cell.textContent?.trim();
     return acc;
    }, {});
   });
  }
 }

 if (!rows_data.length) return;

 const headers = Object.keys(rows_data[0]).join(",");
 const rows = rows_data.map(row => 
  Object.values(row).map(val => `"${val}"`).join(",")
 ).join("\n");

 const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
 const encodedUri = encodeURI(csvContent);
 const link = document.createElement("a");
 link.setAttribute("href", encodedUri);
 link.setAttribute("download", `${fileName}.csv`);
 document.body.appendChild(link);
 link.click();
 document.body.removeChild(link);
};

/**
 * Exports to PDF.
 */
export const exportToPDF = (target: string | RefObject<HTMLElement>, fileName: string = "export") => {
 const element = getElement(target);
 if (!element) return;
 
 console.log(`PDF export requested for ${fileName}, but falling back to print.`);
 window.print(); 
};

