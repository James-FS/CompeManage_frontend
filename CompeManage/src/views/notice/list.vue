<script setup>
import { ElTable, ElTableColumn, ElPagination, ElInput, ElDatePicker, ElButton, ElMessage} from 'element-plus'
import { Search, Refresh,ArrowLeft } from '@element-plus/icons-vue';
import { ref, reactive, onMounted } from 'vue'
import api from '@/api'
import { useRouter } from 'vue-router'
const router = useRouter()
let currentPage = ref(1)
let pageSize = ref(10)
let total = ref(0)
let loading = ref(false)
const searchForm = reactive({
    keyword: '',
    dateRange: [] // 这是一个数组 [开始日期, 结束日期]
});
let noticeList = ref([])

function formatDateTime(dateTime) {
    if (!dateTime) return '--';
    return String(dateTime).slice(0, 10);
}

async function fetchNoticeList() {
    loading.value = true;
    try {
        const [startTime, endTime] = searchForm.dateRange || [];
        const params = {
            page: currentPage.value,
            page_size: pageSize.value,
            start_time: startTime || undefined,
            end_time: endTime || undefined,
            is_latest: true,
            keyword: searchForm.keyword || undefined,
        };

        const res = await api.getNoticeList(params);
        const data = res?.data || {};
        const list = Array.isArray(data.list) ? data.list : [];

        noticeList.value = list.map((item) => ({
            ...item,
            id: item.id ?? item.ID,
            title: item.title || '--',
            dept: item.dept || '--',
            date: formatDateTime(item.publish_time || item.updated_at || item.created_at),
        }));
        total.value = Number(data.total) || 0;
    } catch (error) {
        noticeList.value = [];
        total.value = 0;
        ElMessage.error(error?.message || '获取通知列表失败');
    } finally {
        loading.value = false;
    }
}

function handleSearch() {
    currentPage.value = 1;
    fetchNoticeList();
}

function handleSizeChange(size) {
    pageSize.value = size;
    currentPage.value = 1;
    fetchNoticeList();
}

function handleCurrentChange(page) {
    currentPage.value = page;
    fetchNoticeList();
}

function ResetFilter(){
    searchForm.keyword = '';
    searchForm.dateRange = [];
    currentPage.value = 1;
    pageSize.value = 10;
    fetchNoticeList();
}

function goToDetail(row) {
    if (row && row.id) {
        router.push({
    name: 'Notice',
    params: { id: row.id }
  });
    } else {
        ElMessage.error('无法获取通知ID');
    }
}

const goBack = () => {
  router.back()
}
onMounted(() => {
    fetchNoticeList();
});
</script>

<template>
  <div class="page-container">
    <div class="list-container">
    <div class="back-btn" @click="goBack">
      <svg class="back-arrow" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 12H4M10 18L4 12L10 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span>返回</span>
    </div>
      <div class="list-header">
        <div class="header-title">赛事通知列表</div>
        <div class="header-filter">
            <el-input 
                        v-model="searchForm.keyword" 
                        placeholder="请输入通知标题" 
                        class="search-input"
                        clearable
                        
            />
            <el-date-picker
                        v-model="searchForm.dateRange"
                        type="daterange"
                        range-separator="至"
                        start-placeholder="开始日期"
                        end-placeholder="结束日期"
                        format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD"
                        class="date-input"
            />

            <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
            <el-button :icon="Refresh" @click="ResetFilter">重置</el-button>
        </div>
      </div>
      <div class="list-body">
        <el-table
          :data="noticeList"
          v-loading="loading"
          :header-cell-style="{ 
              background: '#f8fafc', 
              color: '#64748b', 
              height: '54px', 
              fontSize: '14px',
              fontWeight: '600' 
          }"
          @row-click="goToDetail"
          class="list-table"
        >
          <el-table-column label="通知标题" min-width="400">
            <template #default="scope">
                <span class="table-title">{{ scope.row.title }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="dept" label="发布部门" width="180" align="center">
             <template #default="scope">
                <span class="table-dept">{{ scope.row.dept }}</span>
             </template>
          </el-table-column>

          <el-table-column prop="date" label="发布日期" width="150" align="right">
             <template #default="scope">
                <span class="table-date">{{ scope.row.date }}</span>
             </template>
          </el-table-column>

          <template #empty>
            <el-empty description="暂无数据" />
          </template>
        </el-table>
        <div class="pagination-container">
          <el-pagination
            background
            layout="sizes,jumper,prev, pager, next"
            v-model:page-size="pageSize"
            v-model:current-page="currentPage"
            :total="total"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.page-container {
  width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  padding: 20px 40px;
  background-color: #fafbfc;
  background-image:
    radial-gradient(at 0% 0%, rgba(19, 194, 194, 0.06) 0px, transparent 50%),
    radial-gradient(at 100% 100%, rgba(59, 130, 246, 0.04) 0px, transparent 50%);
  background-repeat: no-repeat;
  background-attachment: fixed;

  .list-container {
    display: flex;
    flex-direction: column;
    height: 85vh;
    align-items: stretch;
    background-color: rgba(255, 255, 255, 0.9); /* 90% 不透明度 */
    border-radius: 16px;
    padding: 30px;
    max-width: 1440px;
    margin: 0 auto;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
    backdrop-filter: blur(8px); /* 毛玻璃效果 */
    border: 1px solid rgba(255, 255, 255, 0.5);
    
    .back-btn{
      display: flex;
      align-items: center;
      gap: 8px;
      color: #9ca3af;
      cursor: pointer;
      transition: all 0.2s;
      width: fit-content;
      
      &:hover {
        color: #64748b;
      }
      
      .back-arrow {
        width: 20px;
        height: 20px;
        color: inherit;
      }
      
      span {
        font-size: 14px;
      }
    }

    .list-header {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      border-left: 4px solid var(--primary-color);
      padding-left: 12px;
      margin-bottom: 40px;
      margin-top:20px;
      .header-title {
        font-size: 20px;
        font-weight: 600;
        color: var(--text-primary);
      }
      
      .header-filter {
        display: flex;
        gap: 12px;
        
        .date-input {
          width: 280px;
        }
        
        .search-input {
          width: 280px;
        }
      }
    }
    
    .list-body {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
      
      .pagination-container {
        margin-top: auto;
        display: flex;
        justify-content: center;
      }
    }
  }
}

.list-table {
  width: 100%;
  max-height: 600px;
  margin-bottom: 15px;

  :deep(.el-table__inner-wrapper::before) {
    display: none;
  }
  
  :deep(.el-table__row) {
    height: 60px; 
    font-size: 14px;
    color: #606266;
  }

  :deep(.el-table__body tr:hover > td) {
    background-color: #f5fffe !important; /* 改为更浅的冷色调 */
  }
  
  .table-title {
    color: var(--text-primary);     
    font-size: 15px;     
    font-weight: 500;    
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
      color: var(--primary-color);
    }
  }

  .table-dept {
    color: var(--table-text);
  }

  .table-date {
    color: var(--text-secondary);         
    font-family: Menlo, Monaco, Consolas, monospace;
  }
}
</style>