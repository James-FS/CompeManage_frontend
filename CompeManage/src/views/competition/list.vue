<script setup>
import { ref, reactive } from 'vue';
import { ElMessage } from 'element-plus';
import { Search, Refresh, InfoFilled } from '@element-plus/icons-vue';


// 搜索表单数据
const searchForm = reactive({
    year: '',
    comp_code: '',
    comp_name: '',
    comp_type: '',
    comp_level: '',
    organizer: '',
    undertaker: '',
    college: '',
    manager: '',
})

// 表格模拟数据
const tableDate = ref([
    {
        id: 1,
        comp_code: 'XS2025001',
        comp_name: '2025年广州大学校级ACM程序设计竞赛',
        comp_type: '学科竞赛',
        comp_level: '校级',
        organizer: '广州大学计算机学院',
        undertaker: '广州大学ACM集训队',
        manager: '李教授',
        team_members: '张三、李四、王五',
        project_source: '学校录入',
        is_stopped: false,
        list_type: '校级竞赛榜单',
        college: '计算机学院',
        year: '2025'
    },
    {
        id: 2,
        comp_code: 'XS2025002',
        comp_name: '2025年广州大学校级大学生创新创业训练计划项目（大创）',
        comp_type: '创新创业竞赛',
        comp_level: '校级',
        organizer: '广州大学创新创业学院',
        undertaker: '广州大学教务处',
        manager: '王老师',
        team_members: '赵六、钱七、孙八',
        project_source: '学校录入',
        is_stopped: false,
        list_type: '校级竞赛榜单',
        college: '创新创业学院',
        year: '2025'
    },
    {
        id: 3,
        comp_code: 'XS2025003',
        comp_name: '2025年广州大学校级蓝桥杯软件和信息技术专业人才大赛模拟赛',
        comp_type: '学科竞赛',
        comp_level: '校级',
        organizer: '广州大学计算机学院',
        undertaker: '广州大学软件工程系',
        manager: '张讲师',
        team_members: '周九、吴十、郑十一',
        project_source: '学校录入',
        is_stopped: false,
        list_type: '未进入榜单',
        college: '计算机学院',
        year: '2025'
    },
    {
        id: 4,
        comp_code: 'SS2025001',
        comp_name: '2025年广东省“挑战杯”大学生创业计划竞赛',
        comp_type: '创新创业竞赛',
        comp_level: '省部级',
        organizer: '共青团广东省委、广东省教育厅',
        undertaker: '广州大学',
        manager: '刘主任',
        team_members: '陈十二、杨十三、黄十四',
        project_source: '学校录入',
        is_stopped: false,
        list_type: '省级竞赛榜单',
        college: '经济管理学院',
        year: '2025'
    },
    {
        id: 5,
        comp_code: 'GS2025001',
        comp_name: '2025年全国大学生蓝桥杯软件和信息技术专业人才大赛',
        comp_type: '学科竞赛',
        comp_level: '国家级',
        organizer: '工业和信息化部人才交流中心',
        undertaker: '蓝桥杯全国组委会',
        manager: '林教授',
        team_members: '朱十五、秦十六、尤十七',
        project_source: '学校录入',
        is_stopped: false,
        list_type: '教育部榜单',
        college: '电子信息工程学院',
        year: '2025'
    }
])
</script>

<template>
    <div class="competition-container">
        <!-- 竞赛列表头部搜索栏 -->
        <div class="search-container">
            <el-form :inline="true" :model="searchForm" class="search-form" label-width="100px" label-position="right">
                <el-form-item label="所属年份">
                    <el-select v-model="searchForm.year" placeholder="请选择所属年份" clearable="true" style="width: 220px;">
                        <el-option label="2025年" value="2025">2025年</el-option>
                        <el-option label="2024年" value="2024">2024年</el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="赛事编号">
                    <el-input v-model="searchForm.comp_code" placeholder="请输入赛事编号" clearable="true" style="width:220px"
                        maxlength="20"></el-input>
                </el-form-item>
                <el-form-item label="赛事名称">
                    <el-input v-model="searchForm.comp_name" placeholder="请输入赛事名称" clearable="true" style="width:220px"
                        maxlength="20"></el-input>
                </el-form-item>
                <el-form-item label="赛事级别">
                    <el-select v-model="searchForm.comp_level" placeholder="请选择赛事级别" clearable="true"
                        style="width: 220px">
                        <el-option label="校级" value="校级"></el-option>
                        <el-option label="省级" value="省级"></el-option>
                        <el-option label="国家级" value="国家级"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="所属学院">
                    <el-select v-model="searchForm.college" placeholder="请选择所属学院" clearable="true" style="width: 220px">
                        <el-option label="计算机科学与网络工程学院" value="计算机科学与网络工程学院"></el-option>
                        <el-option label="电子信息工程学院" value="电子信息工程学院"></el-option>
                        <el-option label="经济管理学院" value="经济管理学院"></el-option>
                        <el-option label="创新创业学院" value="创新创业学院"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="赛事负责人">
                    <el-input v-model="searchForm.manager" placeholder="请输入赛事负责人" clearable="true" style="width:220px"
                        maxlength="20"></el-input>
                </el-form-item>
                <el-form-item label="主办单位">
                    <el-input v-model="searchForm.organizer" placeholder="请输入主办单位" clearable="true" style="width:220px"
                        maxlength="50"></el-input>
                </el-form-item>
                <el-form-item label="承办单位">
                    <el-input v-model="searchForm.undertaker" placeholder="请输入承办单位" clearable="true" style="width:220px"
                        maxlength="50"></el-input>
                </el-form-item>
            </el-form>
            <div class="search-actions">
                <el-button type="primary" icon="Search" plain>搜索</el-button>
                <el-button type="default" icon="Refresh" plain>重置</el-button>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.competition-container {
    width: 100%;
    height: 100%;
    background-color: var(--background-color);
}
</style>