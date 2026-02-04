<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Edit, View, DocumentChecked, List } from '@element-plus/icons-vue';
// import api from '@/api';

const router = useRouter();
const activeTab = ref('todo'); // 默认显示待办
const loading = ref(false);
const tableData = ref([]);

// 模拟数据：待总结只显示已结束且未填报的
const loadData = async () => {
    loading.value = true;
    // const params = { 
    //   status: 2, // 只查已结束的
    //   summary_status: activeTab.value === 'todo' ? 0 : 1 // 0未填 1已填
    // };
    // const res = await api.getCompetitionList(params);
    
    // 模拟数据演示
    setTimeout(() => {
        if (activeTab.value === 'todo') {
            tableData.value = [
                { id: 101, comp_name: '2025年大学生程序设计竞赛', end_time: '2025-06-20', organizer: '计算机学院', summary_status: 0 }
            ];
        } else {
            tableData.value = [
                { id: 102, comp_name: '2024年英语演讲比赛', end_time: '2024-12-10', organizer: '外国语学院', summary_status: 1 }
            ];
        }
        loading.value = false;
    }, 500);
};

const handleTabChange = () => {
    loadData();
};

const handleEdit = (row) => {
    router.push({
        name: 'SummaryEdit',
        params: { id: row.id },
        query: { name: row.comp_name }
    });
};
</script>

<template>
    <div class="summary-list-container">
        <el-card shadow="never">
            <template #header>
                <div class="card-header">
                    <span>赛事总结管理</span>
                    <el-button type="primary" plain size="small">导出年度汇编</el-button>
                </div>
            </template>

            <el-tabs v-model="activeTab" @tab-click="handleTabChange">
                <el-tab-pane name="todo">
                    <template #label>
                        <span class="custom-tabs-label">
                            <el-icon><List /></el-icon>
                            <span>待总结 ({{ tableData.length }})</span>
                        </span>
                    </template>
                </el-tab-pane>

                <el-tab-pane name="done">
                    <template #label>
                        <span class="custom-tabs-label">
                            <el-icon><DocumentChecked /></el-icon>
                            <span>已归档</span>
                        </span>
                    </template>
                </el-tab-pane>
            </el-tabs>

            <el-table :data="tableData" v-loading="loading" stripe style="width: 100%">
                <el-table-column prop="comp_name" label="赛事名称" min-width="200" />
                <el-table-column prop="organizer" label="主办单位" width="180" />
                <el-table-column prop="end_time" label="结束时间" width="150" sortable />
                
                <el-table-column label="状态" width="120" align="center">
                    <template #default="scope">
                        <el-tag v-if="scope.row.summary_status === 1" type="success">已归档</el-tag>
                        <el-tag v-else type="warning">未总结</el-tag>
                    </template>
                </el-table-column>

                <el-table-column label="操作" width="150" align="center">
                    <template #default="scope">
                        <el-button 
                            v-if="activeTab === 'todo'"
                            type="primary" link :icon="Edit" 
                            @click="handleEdit(scope.row)">
                            去总结
                        </el-button>
                        <el-button 
                            v-else
                            type="primary" link :icon="View" 
                            @click="handleEdit(scope.row)">
                            查看详情
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-card>
    </div>
</template>

<style scoped>
.summary-list-container {
    padding: 20px;
}
.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.custom-tabs-label .el-icon {
    vertical-align: middle;
    margin-right: 5px;
}
</style>