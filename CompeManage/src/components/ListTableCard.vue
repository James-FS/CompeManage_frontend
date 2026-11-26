<template>
  <div class="list-table-card" :class="{ 'list-table-card--paginated': $slots.pagination }">
    <div v-if="$slots.toolbar" class="list-table-card__toolbar">
      <slot name="toolbar" />
    </div>
    <div class="list-table-card__body">
      <slot />
    </div>
    <div v-if="$slots.pagination" class="list-table-card__pagination">
      <slot name="pagination" />
    </div>
  </div>
</template>

<style scoped>
.list-table-card {
  box-sizing: border-box;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 320px;
  min-width: 0;
  padding: 16px var(--item-padding) 12px;
  background: #fff;
  border-radius: var(--card-radius);
  box-shadow: var(--card-shadow);
}

.list-table-card__toolbar {
  flex-shrink: 0;
  margin-bottom: 12px;
}

.list-table-card__body {
  flex: 1;
  min-height: 0;
  min-width: 0;
}

.list-table-card--paginated .list-table-card__body > :deep(.el-table > .el-table__inner-wrapper::before) {
  display: none;
}

.list-table-card__body :deep(.el-table__empty-block .el-empty) {
  --el-empty-image-width: 112px;
  --el-empty-padding: 16px 0;
  --el-empty-description-margin-top: 12px;
}

.list-table-card__body :deep(.el-table__empty-block .el-empty__description p) {
  color: var(--table-text);
  line-height: 1.5;
}

.list-table-card__pagination {
  display: flex;
  flex-shrink: 0;
  justify-content: center;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-lighter);
}

.list-table-card__pagination :deep(.el-pagination) {
  flex-wrap: wrap;
  justify-content: center;
  row-gap: 8px;
}
</style>
