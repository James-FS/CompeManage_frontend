<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { User, Trophy, Money, Document, ArrowLeft } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import api from '@/api';

const route = useRoute();
const router = useRouter();
const loading = ref(false);

const compId = route.params.id;
const compName = route.query.name || '2025年大学生程序设计竞赛';

// 核心统计指标
const stats = reactive({
    participantCount: 0, // 参赛人数
    awardTotal: 0,       // 获奖总数
    expenseTotal: 0,     // 经费总额
    fileCount: 0         // 附件数量
});

// 详细数据
const detailData = reactive({
    comp_name: '2025年大学生程序设计竞赛',
    organizer: '',
    undertaker: '',
    college_info: { name: '' },
    manager: '',
    time_range: '',
    summary_content: '', // 总结正文
    award_list: [],      // 获奖详情
    expense_list: [],    // 经费详情
    files: []            // 附件列表
});

const buildDisplayFileName = (url, fallbackName) => {
    if (!url) return fallbackName || '';
    const fileName = url.split('/').pop() || '';
    if (fileName.includes('_')) {
        return fileName.substring(fileName.indexOf('_') + 1) || fileName;
    }
    return fileName || fallbackName || '';
};

const normalizeAttachmentList = (list) => {
    if (!Array.isArray(list)) return [];
    return list.map((item) => {
        if (typeof item === 'string') {
            return { name: buildDisplayFileName(item), url: item };
        }
        if (item?.url) {
            return { name: item.name || buildDisplayFileName(item.url), url: item.url };
        }
        return item;
    }).filter(Boolean);
};

// 数据加载
const loadData = async () => {
    loading.value = true;
    try {
        const res = await api.getSummaryDetail(compId);
        const data = res?.data || {};

        detailData.comp_name = data.comp_name || compName || '';
        detailData.organizer = data.organizer || '';
        detailData.undertaker = data.undertaker || '';
        detailData.college_info.name = data.college_info?.name || '';
        detailData.manager = data.manager || '';
        detailData.time_range = data.time_range || '';
        detailData.summary_content = data.summary_content || '';
        detailData.award_list = data.award_stats || [];
        detailData.expense_list = data.expenses || [];
        detailData.files = normalizeAttachmentList(data.attachments || []);

        stats.participantCount = data.participant_count || 0;
// 优化后的赋值（可选）
        stats.awardTotal = data.award_total || 0;
        stats.expenseTotal = data.expense_total || 0;
        stats.fileCount = detailData.files.length;
    } catch (error) {
        console.error(error);
        ElMessage.error('加载总结详情失败');
    } finally {
        loading.value = false;
    }
};

const handleBack = () => {
    router.push({ name: 'SummaryList' });
};

onMounted(() => {
    loadData();
});
</script>

<template>
    <div class="summary-detail-container" v-loading="loading">
        <!-- 赛事基本信息卡片 -->
        <el-card class="info-card" shadow="never">
            <el-descriptions :column="4" border>
                <el-descriptions-item label="赛事名称">{{ detailData.comp_name }}</el-descriptions-item>
                <el-descriptions-item label="主办单位">{{ detailData.organizer }}</el-descriptions-item>
                <el-descriptions-item label="承办单位">{{ detailData.undertaker }}</el-descriptions-item>
                <el-descriptions-item label="所属学院">{{ detailData.college_info?.name || '-' }}</el-descriptions-item>
                <el-descriptions-item label="赛事负责人">{{ detailData.manager }}</el-descriptions-item>
                <el-descriptions-item label="举办时间" :span="2">{{ detailData.time_range }}</el-descriptions-item>
            </el-descriptions>
        </el-card>

        <el-row :gutter="20" class="stats-row">
            <el-col :span="6">
                <el-card shadow="hover" class="stat-card">
                    <div class="stat-item">
                        <div class="stat-icon bg-blue">
                            <el-icon><User /></el-icon>
                        </div>
                        <div class="stat-info">
                            <div class="label">参赛人数</div>
                            <div class="value">{{ stats.participantCount }} <span class="unit">人</span></div>
                        </div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="hover" class="stat-card">
                    <div class="stat-item">
                        <div class="stat-icon bg-orange">
                            <el-icon><Trophy /></el-icon>
                        </div>
                        <div class="stat-info">
                            <div class="label">获奖总数</div>
                            <div class="value">{{ stats.awardTotal }} <span class="unit">项</span></div>
                        </div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="hover" class="stat-card">
                    <div class="stat-item">
                        <div class="stat-icon bg-green">
                            <el-icon><Money /></el-icon>
                        </div>
                        <div class="stat-info">
                            <div class="label">经费总支</div>
                            <div class="value">{{ stats.expenseTotal }} <span class="unit">元</span></div>
                        </div>
                    </div>
                </el-card>
            </el-col>
            <el-col :span="6">
                <el-card shadow="hover" class="stat-card">
                    <div class="stat-item">
                        <div class="stat-icon bg-purple">
                            <el-icon><Document /></el-icon>
                        </div>
                        <div class="stat-info">
                            <div class="label">附件材料</div>
                            <div class="value">{{ stats.fileCount }} <span class="unit">份</span></div>
                        </div>
                    </div>
                </el-card>
            </el-col>
        </el-row>

        <el-row :gutter="20" class="content-row">
            <el-col :span="16">
                <el-card class="detail-card" shadow="never">
                    <template #header>
                        <div class="card-header">
                            <span>赛事总结报告</span>
                        </div>
                    </template>
                    
                    <div class="summary-text-box">
                        <pre>{{ detailData.summary_content }}</pre>
                    </div>

                    <div class="mt-20">
                        <div class="sub-title">附件下载</div>
                        <div class="file-list">
                            <div v-for="(file, index) in detailData.files" :key="index" class="file-item">
                                <el-icon class="mr-5"><Document /></el-icon>
                                <el-link type="primary" :href="file.url">{{ file.name }}</el-link>
                            </div>
                        </div>
                    </div>
                </el-card>
            </el-col>

            <el-col :span="8">
                <el-card class="detail-card mb-20" shadow="never">
                    <template #header><span>获奖情况分布</span></template>
                    <el-table :data="detailData.award_list" stripe style="width: 100%" size="small">
                        <el-table-column prop="level" label="奖项等级" />
                        <el-table-column prop="count" label="人数" align="right" />
                    </el-table>
                </el-card>

                <el-card class="detail-card" shadow="never">
                    <template #header><span>经费使用明细</span></template>
                    <el-table :data="detailData.expense_list" stripe style="width: 100%" size="small" show-summary>
                        <el-table-column prop="usage" label="用途" show-overflow-tooltip />
                        <el-table-column prop="amount" label="金额" align="right" width="80"/>
                    </el-table>
                </el-card>
            </el-col>
        </el-row>
    </div>
</template>

<style scoped lang="scss">
.summary-detail-container {
    padding: 20px;
    background-color: var(--background-color);
    min-height: 100%;

    // 基本信息卡片
    .info-card {
        margin-bottom: 20px;
        border-radius: 4px;
        border: none;
        box-shadow: var(--card-shadow);

        :deep(.el-descriptions) {
            background: #fff;
        }
    }

    // 统计卡片样式
    .stats-row {
        margin-bottom: 20px;
        .stat-card {
            border: none;
            .stat-item {
                display: flex;
                align-items: center;
                padding: 10px 0;
                
                .stat-icon {
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 15px;
                    color: #fff;
                    font-size: 24px;
                    
                    &.bg-blue { background-color: #409EFF; box-shadow: 0 4px 10px rgba(64, 158, 255, 0.3); }
                    &.bg-orange { background-color: #E6A23C; box-shadow: 0 4px 10px rgba(230, 162, 60, 0.3); }
                    &.bg-green { background-color: #67C23A; box-shadow: 0 4px 10px rgba(103, 194, 58, 0.3); }
                    &.bg-purple { background-color: #909399; box-shadow: 0 4px 10px rgba(144, 147, 153, 0.3); }
                }

                .stat-info {
                    .label { font-size: 14px; color: #909399; margin-bottom: 5px; }
                    .value { font-size: 24px; font-weight: bold; color: #303133; }
                    .unit { font-size: 12px; color: #909399; font-weight: normal; margin-left: 2px; }
                }
            }
        }
    }

    .detail-card {
        border-radius: 4px;
        border: none;
        box-shadow: var(--card-shadow);
        
        :deep(.el-card__header) {
            padding: 15px 20px;
            font-weight: bold;
            border-bottom: 1px solid #EBEEF5;
        }
    }

    .summary-text-box {
        background-color: #f9f9f9;
        padding: 20px;
        border-radius: 4px;
        border: 1px dashed #dcdfe6;
        min-height: 200px;
        
        pre {
            white-space: pre-wrap; /* 保持换行 */
            word-wrap: break-word;
            font-family: inherit;
            color: #606266;
            line-height: 1.6;
            margin: 0;
        }
    }

    .sub-title {
        font-size: 14px;
        font-weight: bold;
        color: #303133;
        margin-bottom: 10px;
        border-left: 3px solid #409EFF;
        padding-left: 8px;
    }

    .file-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        
        .file-item {
            display: flex;
            align-items: center;
            font-size: 14px;
            .mr-5 { margin-right: 5px; }
        }
    }

    .mb-20 { margin-bottom: 20px; }
    .mt-20 { margin-top: 20px; }
}
</style>