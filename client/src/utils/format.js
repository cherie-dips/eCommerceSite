// "₹629.10", "₹500" (no ".00" for whole rupees), with Indian digit grouping
export const rupees = (amount) => {
  const n = Number(amount) || 0;
  return `₹${n.toLocaleString("en-IN", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
};
