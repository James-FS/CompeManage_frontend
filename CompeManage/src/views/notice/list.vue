<script setup>
import { ElTable, ElTableColumn, ElPagination,ElTag, ElInput, ElDatePicker, ElButton, ElIcon } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue';
import { ref, reactive } from 'vue'
let currentPage = ref(1)
let pageSize = ref(10)
let total = ref(5000)
const searchForm = reactive({
    keyword: '',
    dateRange: [] // 这是一个数组 [开始日期, 结束日期]
});
let noticeList = ref([
  {
    id: 1,
    title: '关于举办广州大学第二十届ACM大学生程序设计竞赛的通知',
    date: '2026-01-16',
    dept: '教务处',
    tag: '置顶',
    tagType: 'danger',
  },
  {
    id: 6,
    title: '关于举办广州大学第二十届ACM大学生程序设计竞赛的通知',
    date: '2026-01-16',
    dept: '教务处',
    tag: '置顶',
    tagType: 'danger',
  },
  {
    id: 7,
    title: '关于举办广州大学第二十届ACM大学生程序设计竞赛的通知',
    date: '2026-01-16',
    dept: '教务处',
    tag: '置顶',
    tagType: 'danger',
  },
  {
    id: 8,
    title: '关于举办广州大学第二十届ACM大学生程序设计竞赛的通知',
    date: '2026-01-16',
    dept: '教务处',
    tag: '置顶',
    tagType: 'danger',
  },
  {
    id: 9,
    title: '关于举办广州大学第二十届ACM大学生程序设计竞赛的通知',
    date: '2026-01-16',
    dept: '教务处',
    tag: '置顶',
    tagType: 'danger',
  },
  {
    id: 2,
    title: '第十五届“蓝桥杯”全国软件和信息技术专业人才大赛报名通知',
    date: '2026-02-10',
    dept: '计算机学院',
    tag: '热点',
    tagType: 'warning',
  },
  {
    id: 3,
    title: '2026年大学生创新创业训练计划项目申报指南',
    date: '2026-03-05',
    dept: '创新创业学院',
    tag: '通知',
    tagType: 'info',
  },
  {
    id: 4,
    title: '关于开展2026年度学科竞赛获奖统计工作的通知',
    date: '2026-03-12',
    dept: '教务处',
    tag: '',
    tagType: '',
  },
  {
    id: 5,
    title: '2026年全国大学生英语竞赛(NECCS)报名通知',
    date: '2026-04-01',
    dept: '外国语学院',
    tag: '',
    tagType: '',
  },
])

function ResetFilter(){
    searchForm.keyword = '';
    searchForm.dateRange = [];
    
}
</script>

<template>
  <div class="page-container">
    <div class="list-container">
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

            <el-button type="primary" :icon="Search" >查询</el-button>
            <el-button :icon="Refresh" @click="ResetFilter">重置</el-button>
        </div>
      </div>
      <div class="list-body">
        <el-table
          :data="noticeList"
          :header-cell-style="{ 
              background: '#f8fafc', 
              color: '#64748b', 
              height: '54px', 
              fontSize: '14px',
              fontWeight: '600' 
          }"
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
    
    .list-header {
      display: flex;
      flex-direction: row;
      justify-content: space-between;
      align-items: center;
      border-left: 4px solid var(--primary-color);
      padding-left: 12px;
      margin-bottom: 40px;
      
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
