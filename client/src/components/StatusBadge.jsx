// Order status shown as a coloured label
const STATUS = {
  pending_payment: ["Awaiting payment", "badge-warning"],
  paid: ["Paid", "badge-info"],
  processing: ["Being made", "badge-info"],
  shipped: ["Shipped", "badge-brand"],
  sent_to_delivery: ["Shipped", "badge-brand"],
  delivered: ["Delivered", "badge-success"],
  cancelled: ["Cancelled", "badge-danger"],
};

export const statusLabel = (status) => STATUS[status]?.[0] || status;

export default function StatusBadge({ status }) {
  const [label, className] = STATUS[status] || [status, ""];
  return <span className={`badge ${className}`}>{label}</span>;
}
