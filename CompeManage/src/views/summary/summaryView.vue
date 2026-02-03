<script setup>
import { ref, reactive, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { User, Trophy, Money, Document, ArrowLeft } from '@element-plus/icons-vue';

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
    end_time: '',
    time_range: '',
    summary_content: '', // 总结正文
    award_list: [],      // 获奖详情
    expense_list: [],    // 经费详情
    files: []            // 附件列表
});

// 模拟数据加载
const loadData = async () => {
    loading.value = true;
    try {
        // 模拟网络延迟
        setTimeout(() => {
        // 1. 基础信息
            detailData.comp_name = '2025年大学生程序设计竞赛';
            detailData.organizer = '计算机学院';
            detailData.undertaker = '计算机学院团委';
            detailData.college_info.name = '计算机学院';
            detailData.manager = '张三';
            detailData.end_time = '2025-06-20';
            detailData.time_range = '2025-01-01 至 2025-06-20';
            
            // 2. 统计数据
            stats.participantCount = 156;
            
            // 3. 获奖数据
            detailData.award_list = [
                { level: '一等奖', count: 3 },
                { level: '二等奖', count: 5 },
                { level: '三等奖', count: 12 },
                { level: '优秀奖', count: 20 }
            ];
            // 计算获奖总数
            stats.awardTotal = detailData.award_list.reduce((acc, cur) => acc + cur.count, 0);

            // 4. 经费数据
            detailData.expense_list = [
                { usage: '赛事宣传横幅制作', amount: 300, remark: '校内主干道悬挂' },
                { usage: '评审专家劳务费', amount: 2000, remark: '5位专家，每人400' },
                { usage: '获奖证书及奖品', amount: 1500, remark: '定制奖杯与证书' },
                { usage: '比赛现场饮用水', amount: 200, remark: '农夫山泉5箱' }
            ];
            // 计算经费总额
            stats.expenseTotal = detailData.expense_list.reduce((acc, cur) => acc + cur.amount, 0);

            // 5. 总结正文
            detailData.summary_content = `本次竞赛在学校领导的高度重视和各部门的大力支持下圆满结束。
1. 组织严密：成立了专门的竞赛组委会，制定了详细的竞赛章程和实施方案。
2. 参与度高：共有来自全校10个学院的156名学生报名参赛，覆盖面广。
3. 成绩斐然：学生在比赛中展现了扎实的专业基础和良好的创新能力。
存在不足：部分非专业学生对比赛规则不够熟悉，建议明年增加赛前培训环节。`;

            // 6. 附件
            detailData.files = [
                { name: '现场照片合集.zip', url: '#' },
                { name: '获奖名单公示.pdf', url: '#' }
            ];
            stats.fileCount = detailData.files.length;

            loading.value = false;
        }, 500);
    } catch (error) {
        console.error(error);
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
                <el-descriptions-item label="结束时间">{{ detailData.end_time }}</el-descriptions-item>
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