const statuses = {
  0: { label: '待审核', type: 'warning' },
  1: { label: '已通过', type: 'success' },
  2: { label: '已驳回', type: 'danger' },
  3: { label: '补录待审核', type: 'warning' },
  4: { label: '补录已通过', type: 'success' },
  5: { label: '补录已驳回', type: 'danger' },
}

const unknownStatus = { label: '未知', type: 'info' }

export function getRegistrationAuditStatus(status) {
  return Object.hasOwn(statuses, status) ? statuses[status] : unknownStatus
}
