<script setup>
import { ref } from 'vue'
import { Search, Refresh } from '@element-plus/icons-vue'

const searchForm = ref({
  keyword: '',
  status: '',
})

const statusOptions = [
  { label: '全部', value: '' },
  { label: '待评审', value: 'pending' },
  { label: '评审中', value: 'reviewing' },
  { label: '已完成', value: 'completed' },
]

const reviewList = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

const handleSearch = () => {
  currentPage.value = 1
  loadData()
}

const handleReset = () => {
  searchForm.value = { keyword: '', status: '' }
  handleSearch()
}

const handleSizeChange = () => {
  handleSearch()
}

const handleCurrentChange = () => {
  handleSearch()
}

const loadData = () => {
  // TODO: 接入后端 API
}
</script>

<template>
  <div class="review-container">
    <div class="search-container">
      <el-form :inline="true" :model="searchForm" class="search-form" label-width="80px" label-position="right">
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="请输入赛事名称" clearable style="width: 220px" />
        </el-form-item>
        <el-form-item label="评审状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable style="width: 220px">
            <el-option v-for="item in statusOptions" :key="item.value" :label="item.label" :value="item.value" />
          </el-select>
        </el-form-item>
        <el-form-item class="search-actions">
          <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
          <el-button type="default" :icon="Refresh" plain @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div class="review-table-container">
      <el-table v-loading="loading" :data="reviewList" stripe height="calc(100vh - 340px)" style="width: 100%">
        <template #empty>
          <el-empty description="暂无评审数据" />
        </template>
        <el-table-column prop="comp_name" label="赛事名称" min-width="200" align="center" show-overflow-tooltip />
        <el-table-column prop="college" label="申报学院" min-width="150" align="center" show-overflow-tooltip />
        <el-table-column prop="review_status" label="评审状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.review_status === 'pending'" type="warning" size="small" effect="plain">待评审</el-tag>
            <el-tag v-else-if="row.review_status === 'reviewing'" type="primary" size="small" effect="plain">评审中</el-tag>
            <el-tag v-else-if="row.review_status === 'completed'" type="success" size="small" effect="plain">已完成</el-tag>
            <span v-else>{{ row.review_status }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="expert_name" label="评审专家" width="120" align="center" />
        <el-table-column prop="score" label="评审得分" width="100" align="center" />
        <el-table-column prop="review_time" label="评审时间" width="160" align="center" />
        <el-table-column label="操作" width="150" align="center" fixed="right">
          <template #default>
            <el-button type="primary" size="small" link>查看</el-button>
            <el-button type="primary" size="small" link>评审</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 30, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.review-container {
  width: 100%;
  height: 100%;
  background-color: var(--background-color);
  padding: 20px;
  box-sizing: border-box;
}

.search-container {
  box-sizing: border-box;
  margin-bottom: 15px;
  padding: 20px 20px 10px 20px;
  background-color: #ffffff;
  box-shadow: var(--card-shadow);
  border-radius: 4px;

  .search-form {
    .el-form-item {
      margin-bottom: 15px;
      margin-left: 15px;
    }

    .search-actions {
      margin-left: 45px;

      .el-button {
        margin-right: 10px;
      }
    }
  }
}

.review-table-container {
  box-sizing: border-box;
  padding: 20px 20px 10px 20px;
  background-color: #ffffff;
  box-shadow: var(--card-shadow);
  border-radius: 4px;
}

.pagination-wrapper {
  margin-top: 10px;
  display: flex;
  justify-content: center;
}
</style>
