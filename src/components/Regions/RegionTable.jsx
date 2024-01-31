import React, { useMemo, useState, useEffect } from 'react';
import { useTable, useSortBy, useBlockLayout } from 'react-table';
import { FixedSizeList as List } from 'react-window';

import { showKb } from '../../lib/display';

const Table = ({ columns, data }) => {
  // Use the state and functions returned from useTable to build your UI

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    prepareRow,
    rows,
    totalColumnsWidth,
    state: { sortBy },
  } = useTable(
    {
      columns,
      data,
      // manualSortBy: true,
      initialState: { pageIndex: 0 }
    },
    useSortBy,
    useBlockLayout
  );

  // Render the UI for your table
  return (
    <div {...getTableProps()} style={{ width: totalColumnsWidth }}>
      <div>
        {headerGroups.map((headerGroup, hgi) => (
          <div key={hgi} {...headerGroup.getHeaderGroupProps()}>
            {headerGroup.headers.map((column, index) => (
              <div key={index} {...column.getHeaderProps(column.getSortByToggleProps())}>
                {column.render('Header')}
                <span>
                  {column.isSorted ? (column.isSortedDesc ? ' 🔽' : ' 🔼') : ''}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div {...getTableBodyProps()}>
        <List
          height={400}
          itemCount={rows.length}
          itemSize={35}
          width={totalColumnsWidth}
        >
          {({ index, style }) => {
            const row = rows[index];
            prepareRow(row);
            return (
              <div {...row.getRowProps({ style })}>
                {row.cells.map((cell, ci) => {
                  return (
                    <div key={ci} {...cell.getCellProps()}>
                      {cell.render('Cell')}
                    </div>
                  );
                })}
              </div>
            );
          }}
        </List>
      </div>
    </div>
  );
};

const RegionTable = ({ rows }) => {
  const columns = useMemo(
    () => [
      { Header: 'Chromosome', accessor: 'chromosome' },
      { Header: 'Start', accessor: 'start' },
      { Header: 'End', accessor: 'end' },
      { Header: 'Length', accessor: 'length', Cell: ({ value }) => showKb(value)},
      { Header: 'Name', accessor: 'name' },
      { Header: 'Score', accessor: 'score', Cell: ({ value }) => value?.toFixed(2)},
      // Add more columns here
    ],
    []
  );


  return (
    <Table
      columns={columns}
      data={rows}
    />
  );
};

export default RegionTable;