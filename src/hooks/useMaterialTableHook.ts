import { useState, useMemo } from "react";
export type RowObject = { [key: string]: string | number | boolean };
type Order = "asc" | "desc";

function useMaterialTableHook<T extends RowObject>(
  initialRows: T[],
  defalutData: number = 20
) {
  const [rows, setRows] = useState(initialRows);
  const [order, setOrder] = useState<Order>("asc");
  const [orderBy, setOrderBy] = useState<string>("");
  const [selected, setSelected] = useState<number[]>([]);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defalutData);
  const [searchQuery, setSearchQuery] = useState("");

  const handleRequestSort = (property: string) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleSelectAllClick = (checked: boolean, rows: T[]) => {
    setSelected(checked ? rows.map((_, index) => index) : []);
  };

  const handleClick = (id: number) => {
    const selectedIndex = selected.indexOf(id);
    let newSelected: number[] = [];

    if (selectedIndex === -1) {
      newSelected = [...selected, id];
    } else if (selectedIndex === 0) {
      newSelected = selected.slice(1);
    } else if (selectedIndex === selected.length - 1) {
      newSelected = selected.slice(0, -1);
    } else {
      newSelected = [
        ...selected.slice(0, selectedIndex),
        ...selected.slice(selectedIndex + 1),
      ];
    }

    setSelected(newSelected);
  };

  const handleChangePage = (newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (newRowsPerPage: number) => {
    setRowsPerPage(newRowsPerPage);
    setPage(1); // Reset to first page when changing rows per page
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setPage(1); // Reset to first page when changing search query
  };

  const isSelected = (id: number) => selected.includes(id);

  const filteredRows = useMemo(
    () =>
      rows.filter((row) =>
        Object.values(row).some((value) =>
          value?.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
      ),
    [rows, searchQuery]
  );

  const sortedRows = useMemo(() => {
    const comparator = (a: any, b: any) => {
      if (!orderBy) return 0;
      const valueA = a[orderBy];
      const valueB = b[orderBy];

      if (valueB < valueA) return order === "asc" ? -1 : 1;
      if (valueB > valueA) return order === "asc" ? 1 : -1;
      return 0;
    };
    return [...filteredRows].sort(comparator);
  }, [filteredRows, order, orderBy]);

  // Handle Delete for Single Row
  const handleDelete = (idToDelete: number) => {
    setRows((prevRows) => prevRows.filter((_, index) => index !== idToDelete));
    setSelected([]); // Clear selection after delete
    setPage(1); // Reset to first page after deletion to refresh paginated rows
  };

  const paginatedRows = useMemo(
    () =>
      sortedRows.slice(
        (page - 1) * rowsPerPage,
        Math.min(page * rowsPerPage, sortedRows.length)
      ),
    [sortedRows, page, rowsPerPage]
  );

  return {
    order,
    orderBy,
    selected,
    page,
    rowsPerPage,
    searchQuery,
    filteredRows,
    sortedRows,
    paginatedRows,
    isSelected,
    handleRequestSort,
    handleSelectAllClick,
    handleClick,
    handleChangePage,
    handleChangeRowsPerPage,
    handleSearchChange,
    handleDelete, // Expose handleDelete in return
  };
}

export default useMaterialTableHook;
