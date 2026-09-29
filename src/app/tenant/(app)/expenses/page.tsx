"use client";

import { DeleteOutlined, EditOutlined, PaperClipOutlined, PlusOutlined } from "@ant-design/icons";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { App, Button, Card, Col, DatePicker, Empty, Flex, Input, Popconfirm, Progress, Result, Row, Select, Tag, Typography, type TableProps } from "antd";
import dayjs from "dayjs";
import { Suspense, useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { FilterPanel } from "@/components/FilterPanel";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { EXPENSE_CATEGORIES, ExpenseFormDrawer } from "@/components/expenses/ExpenseFormDrawer";
import { invalidatePortfolio } from "@/components/portfolio/invalidate";
import { useT } from "@/i18n/provider";
import { errorMessage } from "@/lib/api/errors";
import type { Expense, ExpenseCategory } from "@/lib/api/types";
import { useTenant } from "@/lib/auth/tenant-context";
import { formatDate, formatMoney } from "@/lib/format";
import { usePortfolioPermissions } from "@/lib/portfolio-hooks";
import { useUrlState } from "@/lib/url-state";

function ExpensesPage() {
  const { api } = useTenant();
  const { t, tn } = useT();
  const url = useUrlState();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const { canManageExpenses } = usePortfolioPermissions();
  const [editing, setEditing] = useState<{ expense?: Expense }>();

  const month = url.get("month") ?? dayjs().format("YYYY-MM");
  const filters = {
    month: `${month}-01`,
    propertyId: url.get("propertyId"),
    category: url.get("category") as ExpenseCategory | undefined,
    search: url.get("search"),
  };
  const params = { ...filters, page: url.getNumber("page") ?? 0, size: 20, sort: "spentOn,desc" };
  const list = useQuery({
    queryKey: ["expenses", params], queryFn: () => api.expenses(params), placeholderData: keepPreviousData,
    enabled: canManageExpenses,
  });
  const summary = useQuery({
    queryKey: ["expense-summary", filters], queryFn: () => api.expenseSummary(filters), enabled: canManageExpenses,
  });
  const properties = useQuery({
    queryKey: ["properties", "options"], queryFn: () => api.properties({ page: 0, size: 100, sort: "name,asc" }),
    enabled: canManageExpenses,
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.deleteExpense(id),
    onSuccess: () => { message.success(t("expenses.deleted")); invalidatePortfolio(queryClient); },
    onError: (error) => message.error(errorMessage(error)),
  });

  if (!canManageExpenses) {
    return <Result status="403" title={t("gate.noAccess")} />;
  }

  const s = summary.data;
  const categories = s ? EXPENSE_CATEGORIES.filter((c) => s.byCategory[c] > 0).sort((a, b) => s.byCategory[b] - s.byCategory[a]) : [];
  const columns: TableProps<Expense>["columns"] = [
    { title: t("expenses.date"), key: "date", width: 110, render: (_, e) => formatDate(e.spentOn) },
    {
      title: t("expenses.description"), key: "description",
      render: (_, e) => (
        <Flex vertical>
          <Typography.Text strong>{e.description} {e.receiptUrl && (
            <a href={e.receiptUrl} target="_blank" rel="noreferrer" title={t("expenses.viewReceipt")}><PaperClipOutlined /></a>
          )}</Typography.Text>
          {e.paidTo && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{e.paidTo}</Typography.Text>}
        </Flex>
      ),
    },
    {
      title: t("expenses.where"), key: "where",
      render: (_, e) => <span style={{ fontSize: 13 }}>{[e.property.name, e.building?.name, e.unit?.name].filter(Boolean).join(" · ")}</span>,
    },
    { title: t("expenses.category"), key: "category", render: (_, e) => <Tag>{t(`expenseCategory.${e.category}`)}</Tag> },
    { title: t("expenses.method"), key: "method", responsive: ["lg"], render: (_, e) => t(`paymentMethod.${e.method}`) },
    { title: t("expenses.amount"), key: "amount", align: "right", render: (_, e) => <Typography.Text strong>{formatMoney(e.amount)}</Typography.Text> },
    {
      key: "actions", width: 90, align: "right",
      render: (_, e) => (
        <Flex gap={2} justify="end">
          <Button type="text" size="small" icon={<EditOutlined />} aria-label={t("common.edit")} onClick={() => setEditing({ expense: e })} />
          <Popconfirm title={t("expenses.deleteTitle")} okText={t("common.delete")} okButtonProps={{ danger: true }}
            onConfirm={() => remove.mutate(e.id)}>
            <Button type="text" size="small" danger icon={<DeleteOutlined />} aria-label={t("common.delete")} />
          </Popconfirm>
        </Flex>
      ),
    },
  ];

  return (
    <>
      <PageHeader title={t("expenses.title")} description={t("expenses.subtitle")}
        extra={
          <Flex gap={8} wrap>
            <DatePicker picker="month" allowClear={false} value={dayjs(filters.month)} format="MMMM YYYY"
              onChange={(d) => url.set({ month: d ? d.format("YYYY-MM") : undefined })} />
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing({})}>{t("expenses.add")}</Button>
          </Flex>
        } />
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Card size="small" style={{ height: "100%" }}>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>{t("expenses.total")} · {dayjs(filters.month).format("MMMM YYYY")}</Typography.Text>
            <div style={{ fontWeight: 600, fontSize: 26 }}>{formatMoney(s?.total ?? 0)}</div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>{tn("expenses.count", s?.count ?? 0)}</Typography.Text>
          </Card>
        </Col>
        <Col xs={24} md={16}>
          <Card size="small" style={{ height: "100%" }}>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>{t("expenses.byCategory")}</Typography.Text>
            {categories.length === 0 && <div style={{ color: "#999", marginTop: 6 }}>—</div>}
            <Flex vertical gap={2} style={{ marginTop: 4 }}>
              {categories.slice(0, 5).map((c) => (
                <Flex key={c} align="center" gap={8}>
                  <span style={{ width: 140, fontSize: 13 }}>{t(`expenseCategory.${c}`)}</span>
                  <Progress percent={Math.round((s!.byCategory[c] / s!.total) * 100)} showInfo={false} size="small" style={{ flex: 1, margin: 0 }} />
                  <span style={{ width: 80, textAlign: "right", fontSize: 13, fontWeight: 600 }}>{formatMoney(s!.byCategory[c])}</span>
                </Flex>
              ))}
            </Flex>
          </Card>
        </Col>
      </Row>
      <Card>
        <Flex gap={12} wrap style={{ marginBottom: 16 }}>
          <Input.Search key={filters.search ?? ""} defaultValue={filters.search} allowClear style={{ width: 260 }}
            placeholder={t("expenses.searchPlaceholder")} onSearch={(search) => url.set({ search })} />
          <FilterPanel active={[filters.propertyId, filters.category].filter(Boolean).length}>
<Select allowClear placeholder={t("expenses.property")} style={{ width: 200 }} value={filters.propertyId}
            showSearch={{ optionFilterProp: "label" }} onChange={(v) => url.set({ propertyId: v })}
            options={(properties.data?.content ?? []).map((p) => ({ value: p.id, label: p.name }))} />
          <Select allowClear placeholder={t("expenses.allCategories")} style={{ width: 190 }} value={filters.category}
            onChange={(v) => url.set({ category: v })}
            options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: t(`expenseCategory.${c}`) }))} />
          </FilterPanel>
        </Flex>
        <ResponsiveTable<Expense> rowKey="id" columns={columns} dataSource={list.data?.content} loading={list.isFetching}
          scroll={{ x: 820 }} size="middle"
          locale={{
            emptyText: list.error ? errorMessage(list.error) : (
              <Empty description={filters.search || filters.propertyId || filters.category ? t("expenses.noMatch") : t("expenses.empty")}>
                {!filters.search && <Button type="primary" icon={<PlusOutlined />} onClick={() => setEditing({})}>{t("expenses.add")}</Button>}
              </Empty>
            ),
          }}
          onChange={(p) => url.set({ page: (p.current ?? 1) - 1 || undefined })}
          pagination={{ current: params.page + 1, pageSize: params.size, total: list.data?.totalElements ?? 0, hideOnSinglePage: true }} />
      </Card>
      {editing && (
        <ExpenseFormDrawer open expense={editing.expense} propertyId={filters.propertyId} onClose={() => setEditing(undefined)} />
      )}
    </>
  );
}

export default function Page() {
  return (
    <Suspense>
      <ExpensesPage />
    </Suspense>
  );
}
