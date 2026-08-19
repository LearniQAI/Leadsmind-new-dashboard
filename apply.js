const fs = require('fs');
const path = require('path');

const tablePath = path.join(process.cwd(), 'src', 'components', 'pagesUI', 'hrm', 'attendance', 'AdminAttendanceTable.tsx');
let tableCode = fs.readFileSync(tablePath, 'utf8');

// 1. We need to swap the fake "adminAttendanceData" for real database state
if (!tableCode.includes('const [realData, setRealData] = React.useState')) {
  
  // Add the state and useEffect
  tableCode = tableCode.replace(
    /const AdminAttendanceTable = \(\) => \{/,
    `const AdminAttendanceTable = () => {
 const [realData, setRealData] = React.useState<any[]>([]);
 const [isLoading, setIsLoading] = React.useState(true);

 React.useEffect(() => {
   async function loadData() {
     try {
       const res = await getAttendanceRecords();
       if (res.success && res.data) {
         setRealData(res.data);
       }
     } catch(e) {
       console.error("Failed to load attendance");
     } finally {
       setIsLoading(false);
     }
   }
   loadData();
 }, []);
`
  );

  // 2. Replace the fake data array with our real data array in the pagination logic
  tableCode = tableCode.replace(/paginatedRows = filteredRows\.slice/g, "paginatedRows = (realData.length > 0 ? realData : filteredRows).slice");

  // 3. Fix the mapping to use real database columns instead of fake ones
  tableCode = tableCode.replace(
    /row\.employeeImg/g,
    "(row.employees?.avatar_url || row.employeeImg)"
  );
  tableCode = tableCode.replace(
    /row\.name/g,
    "(row.employees ? \`\${row.employees.first_name} \${row.employees.last_name}\` : row.name)"
  );
  tableCode = tableCode.replace(
    />\s*\{row\.date1\}\s*<\/span>/g,
    ">{row.status || row.date1}</span>"
  );
  
  fs.writeFileSync(tablePath, tableCode);
  console.log("SUCCESS! HR Attendance Table wired to Backend API.");
} else {
  console.log("Already wired!");
}