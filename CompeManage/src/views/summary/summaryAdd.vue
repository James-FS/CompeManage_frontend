<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { User, Trophy, DataLine, Picture } from '@element-plus/icons-vue';
// import api from '@/api/index'; // 假设您有API

const route = useRoute();
const router = useRouter();
const loading = ref(false);

const compId = route.params.id;
const compName = route.query.name || '赛事';

// 1. 统计数据（建议从后端获取实时数据）
const stats = reactive({
    participantCount: 0, // 报名人数
    teamCount: 0,        // 队伍数
    awardCount: 0,       // 获奖数
    coverage: '0%'       // 学院覆盖率
});

// 2. 总结表单数据
const summaryForm = reactive({
    content: '',         // 总结正文
    highlight: '',       // 亮点展示
    problems: '',        // 存在问题
    files: []            // 附件列表
});

// 模拟加载数据
const loadData = async () => {
    loading.value = true;
    try {
        // const res = await api.getCompetitionSummary(compId);
        // 这里模拟回显数据
        stats.participantCount = 128;
        stats.teamCount = 32;
        stats.awardCount = 15;
        
        // summaryForm.content = res.data.content;
    } catch (error) {
        console.error(error);
    } finally {
        loading.value = false;
    }
};

const handleSave = async () => {
    // 调用保存接口
    ElMessage.success('保存成功');
    // router.push('/competition/list');
};

const handleCancel = () => {
    router.back();
};

onMounted(() => {
    loadData();
});
</script>

<template>
    <div class="summary-container" v-loading="loading">
        <div class="page-header">
            <el-page-header @back="handleCancel">
                <template #content>
                    <span class="text-large font-600 mr-3"> {{ compName }} - 赛事总结 </span>
                </template>
                <template #extra>
                    <el-button @click="handleCancel">取消</el-button>
                    <el-button type="primary" @click="handleSave">保存总结</el-button>
                </template>
            </el-page-header>
        </div>

        <el-row :gutter="20" class="stats-row">
            <el-col :span="6">
                <el-card shadow="hover" class="stat-card">
                    <template #header>
                        <div class="card-header">
                            <span>报名人数</span>
                            <el-icon><User /></el-icon>
                        </div>
                    </template>
                    <div class="card-value">{{ stats.participantCount }}</div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="hover" class="stat-card">
                    <template #header>
                        <div class="card-header">
                            <span>参赛队伍</span>
                            <el-icon><DataLine /></el-icon>
                        </div>
                    </template>
                    <div class="card-value">{{ stats.teamCount }}</div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="hover" class="stat-card">
                    <template #header>
                        <div class="card-header">
                            <span>获奖总数</span>
                            <el-icon><Trophy /></el-icon>
                        </div>
                    </template>
                    <div class="card-value">{{ stats.awardCount }}</div>
                </el-card>
            </el-col>
             <el-col :span="6">
                <el-card shadow="hover" class="stat-card">
                    <template #header>
                        <div class="card-header">
                            <span>现场照片</span>
                            <el-icon><Picture /></el-icon>
                        </div>
                    </template>
                    <div class="card-value">{{ summaryForm.files.length }} 张</div>
                </el-card>
            </el-col>
        </el-row>

        <el-card class="form-card">
            <template #header>
                <div class="clearfix">
                    <span>详细报告</span>
                </div>
            </template>
            
            <el-form :model="summaryForm" label-width="100px" label-position="top">
                <el-row :gutter="20">
                    <el-col :span="12">
                        <el-form-item label="赛事举办情况概述">
                            <el-input 
                                v-model="summaryForm.content" 
                                type="textarea" 
                                :rows="6" 
                                placeholder="请输入赛事的基本举办情况，包括组织过程、宣传情况等..."
                            />
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="成效与亮点">
                            <el-input 
                                v-model="summaryForm.highlight" 
                                type="textarea" 
                                :rows="6" 
                                placeholder="请输入本次赛事的创新点、取得的突破性成绩等..."
                            />
                        </el-form-item>
                    </el-col>
                </el-row>

                <el-form-item label="存在问题与改进建议">
                    <el-input 
                        v-model="summaryForm.problems" 
                        type="textarea" 
                        :rows="4" 
                        placeholder="请输入本次赛事遇到的问题及对未来的建议"
                    />
                </el-form-item>

                <el-form-item label="附件材料 (现场照片/总结文档)">
                    <el-upload
                        class="upload-demo"
                        action="#"
                        :auto-upload="false"
                        :limit="5"
                        list-type="picture-card"
                    >
                        <el-icon><Plus /></el-icon>
                    </el-upload>
                </el-form-item>
            </el-form>
        </el-card>
    </div>
</template>

<style scoped lang="scss">
.summary-container {
    padding: 20px;
    background-color: var(--background-color);
    
    .page-header {
        background: #fff;
        padding: 15px 20px;
        margin-bottom: 20px;
        border-radius: 4px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.05);
    }

    .stats-row {
        margin-bottom: 20px;
        
        .stat-card {
            .card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .card-value {
                font-size: 24px;
                font-weight: bold;
                color: #409EFF;
                text-align: center;
                padding: 10px 0;
            }
        }
    }

    .form-card {
        min-height: 500px;
    }
}
</style>