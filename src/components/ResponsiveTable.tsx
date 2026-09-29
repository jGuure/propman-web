"use client";

import { Empty, Flex, Pagination, Spin, Table, Typography, type TableColumnType, type TableProps } from "antd";
import type { ReactNode } from "react";
import { useIsMobile } from "@/lib/responsive";

type Column<T> = TableColumnType<T> & { children?: Column<T>[] };

function leafColumns<T>(columns: Column<T>[] = []): Column<T>[] {
  return columns.flatMap((c) => (c.children ? leafColumns(c.children) : [c]));
}

function valueOf<T>(row: T, dataIndex: TableColumnType<T>["dataIndex"]): unknown {
  if (dataIndex === undefined || dataIndex === null) {
    return undefined;
  }
  const path = Array.isArray(dataIndex) ? dataIndex : [dataIndex];
  return path.reduce<unknown>((obj, key) => (obj == null ? undefined : (obj as Record<string, unknown>)[key as string]), row);
}

function cellOf<T>(column: Column<T>, row: T, index: number): ReactNode {
  const value = valueOf(row, column.dataIndex);
  const rendered = column.render ? column.render(value, row, index) : value;
  if (rendered && typeof rendered === "object" && "children" in (rendered as object) && !("$$typeof" in (rendered as object))) {
    return (rendered as { children: ReactNode }).children;
  }
  return rendered as ReactNode;
}

const isEmpty = (node: ReactNode) => node === null || node === undefined || node === "" || node === false;

/** The action column: an explicit "actions" key, or a column without a title and data (the ⋯ button). */
const isActions = <T,>(c: Column<T>) => c.key === "actions" || (!c.title && c.dataIndex === undefined);

/**
 * antd Table on desktop; on phones every row becomes a card built from the same columns: the first column is the
 * card title, the action column sits top right, and the other columns are label / value lines. Nothing is cut off
 * and nothing needs sideways scrolling. Paging, loading and the empty text work the same.
 */
export function ResponsiveTable<T extends object>(props: TableProps<T>) {
  const mobile = useIsMobile();
  if (!mobile) {
    return <Table<T> {...props} />;
  }

  const { columns, dataSource = [], rowKey, loading, pagination, onChange, onRow, locale } = props;
  const leaves = leafColumns(columns as Column<T>[]).filter((c) => !c.hidden);
  const actions = leaves.find(isActions);
  const [titleColumn, ...rest] = leaves.filter((c) => c !== actions);
  const keyOf = (row: T, index: number) =>
    String(typeof rowKey === "function" ? rowKey(row, index) : rowKey ? (row as Record<string, unknown>)[rowKey as string] : index);

  const paging = pagination && typeof pagination === "object" ? pagination : undefined;
  const spinning = typeof loading === "object" ? Boolean(loading.spinning) : Boolean(loading);

  return (
    <Spin spinning={spinning}>
      <Flex vertical gap={10}>
        {dataSource.length === 0 && !spinning && (
          <div style={{ padding: "24px 0" }}>{locale?.emptyText ? <Typography.Text type="secondary" style={{ display: "block", textAlign: "center" }}>{locale.emptyText as ReactNode}</Typography.Text> : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}</div>
        )}
        {dataSource.map((row, index) => {
          const handlers = onRow?.(row, index) ?? {};
          const tap = handlers.onClick ?? handlers.onDoubleClick;
          return (
            <div key={keyOf(row, index)} onClick={tap as never}
              style={{ padding: "12px 14px", border: "1px solid #eef0f0", borderRadius: 10, background: "#fff", cursor: tap ? "pointer" : undefined }}>
              <Flex justify="space-between" align="start" gap={8}>
                <div style={{ minWidth: 0, fontWeight: 600 }}>{titleColumn && cellOf(titleColumn, row, index)}</div>
                {actions && <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>{cellOf(actions, row, index)}</div>}
              </Flex>
              {rest.length > 0 && (
                <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "8px 12px", marginTop: 10 }}>
                  {rest.map((column, i) => {
                    const cell = cellOf(column, row, index);
                    return (
                      <div key={String(column.key ?? column.dataIndex ?? i)} style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 11, color: "#8a8a86", textTransform: "uppercase", letterSpacing: 0.3 }}>
                          {typeof column.title === "function" ? null : (column.title as ReactNode)}
                        </div>
                        <div style={{ fontSize: 14, overflowWrap: "anywhere" }}>{isEmpty(cell) ? "—" : cell}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
        {paging && (paging.total ?? 0) > (paging.pageSize ?? 10) && (
          <Flex justify="center" style={{ marginTop: 4 }}>
            <Pagination simple current={paging.current} pageSize={paging.pageSize} total={paging.total}
              onChange={(current, pageSize) => {
                paging.onChange?.(current, pageSize);
                onChange?.({ current, pageSize, total: paging.total }, {}, [], { action: "paginate", currentDataSource: dataSource as T[] });
              }} />
          </Flex>
        )}
      </Flex>
    </Spin>
  );
}
