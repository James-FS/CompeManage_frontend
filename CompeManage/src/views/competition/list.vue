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
const tableData = ref([
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
        status: '进行中',
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
        status: '进行中',
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
        team_members: '周九、吴十',
        project_source: '学校录入',
        status: "未开始",
        college: '计算机学院',
        year: '2025'
    },
    {
        id: 4,
        comp_code: 'SS2025001',
        comp_name: '2025年广东省“挑战杯”大学生创业计划竞赛',
        comp_type: '创新创业竞赛',
        comp_level: '省部级',
        organizer: '广东省教育厅',
        undertaker: '广州大学',
        manager: '刘主任',
        team_members: '陈十二',
        project_source: '学校录入',
        status: '进行中',
        college: '经济管理学院',
        year: '2025'
    },
    {
        id: 5,
        comp_code: 'GS2025001',
        comp_name: '2025年全国大学生蓝桥杯软件和信息技术专业人才大赛',
        comp_type: '学科竞赛',
        comp_level: '国家级',
        organizer: '教育部',
        undertaker: '蓝桥杯全国组委会',
        manager: '林教授',
        team_members: '朱十五',
        project_source: '学校录入',
        status: '进行中',
        college: '电子信息工程学院',
        year: '2025'
    },
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
        status: '进行中',
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
        status: '进行中',
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
        team_members: '周九、吴十',
        project_source: '学校录入',
        status: "未开始",
        college: '计算机学院',
        year: '2025'
    },
    {
        id: 4,
        comp_code: 'SS2025001',
        comp_name: '2025年广东省“挑战杯”大学生创业计划竞赛',
        comp_type: '创新创业竞赛',
        comp_level: '省部级',
        organizer: '广东省教育厅',
        undertaker: '广州大学',
        manager: '刘主任',
        team_members: '陈十二',
        project_source: '学校录入',
        status: '进行中',
        college: '经济管理学院',
        year: '2025'
    },
    {
        id: 5,
        comp_code: 'GS2025001',
        comp_name: '2025年全国大学生蓝桥杯软件和信息技术专业人才大赛',
        comp_type: '学科竞赛',
        comp_level: '国家级',
        organizer: '教育部',
        undertaker: '蓝桥杯全国组委会',
        manager: '林教授',
        team_members: '朱十五',
        project_source: '学校录入',
        status: '进行中',
        college: '电子信息工程学院',
        year: '2025'
    },
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
        status: '进行中',
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
        status: '进行中',
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
        team_members: '周九、吴十',
        project_source: '学校录入',
        status: "未开始",
        college: '计算机学院',
        year: '2025'
    },
    {
        id: 4,
        comp_code: 'SS2025001',
        comp_name: '2025年广东省“挑战杯”大学生创业计划竞赛',
        comp_type: '创新创业竞赛',
        comp_level: '省部级',
        organizer: '广东省教育厅',
        undertaker: '广州大学',
        manager: '刘主任',
        team_members: '陈十二',
        project_source: '学校录入',
        status: '进行中',
        college: '经济管理学院',
        year: '2025'
    },
    {
        id: 5,
        comp_code: 'GS2025001',
        comp_name: '2025年全国大学生蓝桥杯软件和信息技术专业人才大赛',
        comp_type: '学科竞赛',
        comp_level: '国家级',
        organizer: '教育部',
        undertaker: '蓝桥杯全国组委会',
        manager: '林教授',
        team_members: '朱十五',
        project_source: '学校录入',
        status: '进行中',
        college: '电子信息工程学院',
        year: '2025'
    },
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
        status: '进行中',
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
        status: '进行中',
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
        team_members: '周九、吴十',
        project_source: '学校录入',
        status: "未开始",
        college: '计算机学院',
        year: '2025'
    },
    {
        id: 4,
        comp_code: 'SS2025001',
        comp_name: '2025年广东省“挑战杯”大学生创业计划竞赛',
        comp_type: '创新创业竞赛',
        comp_level: '省部级',
        organizer: '广东省教育厅',
        undertaker: '广州大学',
        manager: '刘主任',
        team_members: '陈十二',
        project_source: '学校录入',
        status: '进行中',
        college: '经济管理学院',
        year: '2025'
    },
    {
        id: 5,
        comp_code: 'GS2025001',
        comp_name: '2025年全国大学生蓝桥杯软件和信息技术专业人才大赛',
        comp_type: '学科竞赛',
        comp_level: '国家级',
        organizer: '教育部',
        undertaker: '蓝桥杯全国组委会',
        manager: '林教授',
        team_members: '朱十五',
        project_source: '学校录入',
        status: '进行中',
        college: '电子信息工程学院',
        year: '2025'
    },
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
        status: '进行中',
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
        status: '进行中',
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
        team_members: '周九、吴十',
        project_source: '学校录入',
        status: "未开始",
        college: '计算机学院',
        year: '2025'
    },
    {
        id: 4,
        comp_code: 'SS2025001',
        comp_name: '2025年广东省“挑战杯”大学生创业计划竞赛',
        comp_type: '创新创业竞赛',
        comp_level: '省部级',
        organizer: '广东省教育厅',
        undertaker: '广州大学',
        manager: '刘主任',
        team_members: '陈十二',
        project_source: '学校录入',
        status: '进行中',
        college: '经济管理学院',
        year: '2025'
    },
    {
        id: 5,
        comp_code: 'GS2025001',
        comp_name: '2025年全国大学生蓝桥杯软件和信息技术专业人才大赛',
        comp_type: '学科竞赛',
        comp_level: '国家级',
        organizer: '教育部',
        undertaker: '蓝桥杯全国组委会',
        manager: '林教授',
        team_members: '朱十五',
        project_source: '学校录入',
        status: '进行中',
        college: '电子信息工程学院',
        year: '2025'
    },
])
</script>

<template>
    <div class="competition-container">
        <!-- 赛事列表头部搜索栏 -->
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
                <el-button type="primary" plain>搜索</el-button>
                <el-button type="default" plain>重置</el-button>
            </div>
        </div>

        <!-- 赛事列表表格 -->
        <div class="competition-table-container">
            <el-table v-if="tableData.length > 0" :data="tableData" stripe height="400" style="width: 100%">
                <el-table-column type="selection" width="40" />
                <el-table-column prop="id" label="序号" width="60" align="center"></el-table-column>
                <el-table-column prop="comp_code" label="竞赛编号" min-width="100" align="center"></el-table-column>
                <el-table-column prop="comp_name" label="竞赛名称" min-width="200" show-overflow-tooltip
                    align="center"></el-table-column>
                <el-table-column prop="comp_type" label="竞赛类型" width="110" align="center"></el-table-column>
                <el-table-column prop="comp_level" label="竞赛级别" width="100" align="center"></el-table-column>
                <el-table-column prop="organizer" label="主办单位" min-width="150" align="center"></el-table-column>
                <el-table-column prop="undertaker" label="承办单位" min-width="150" align="center"></el-table-column>
                <el-table-column prop="manager" label="赛事负责人" width="100" align="center"></el-table-column>
                <el-table-column prop="team_members" label="团队成员" min-width="120" align="center" show-overflow-tooltip></el-table-column>
                <el-table-column prop="college" label="所属学院" width="150" align="center"></el-table-column>
            </el-table>
            <el-empty v-else description="暂无数据" />
            <div v-if="tableData.length > 0" class="pagination-wrapper">
                <el-pagination v-model:current-page="current_page" v-model:page-size="page_size"
                    :page-sizes="[10, 20, 30, 50]" layout="total, sizes, prev, pager, next, jumper" :total="400"
                    @size-change="handleSizeChange" @current-change="handleCurrentChange" />
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.competition-container {
    width: 100%;
    height: 100%;
    background-color: var(--background-color);
    padding: 20px;
    box-sizing: border-box;
}

.search-container {
    box-sizing: border-box;
    margin-bottom: 15px;
    padding: 20px;
    background-color: #ffffff;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
    border-radius: 4px;

    .search-form {
        .el-form-item {
            margin-bottom: 15px;
            margin-left: 15px;
        }
    }

    .search-actions {
        display: flex;
        justify-content: center;
        gap: 25px;
    }
}

.competition-table-container {
    box-sizing: border-box;
    padding: 20px 20px 10px 20px;
    background-color: #ffffff;
    box-shadow: 0 1px 5px rgba(0, 0, 0, 0.1);
    border-radius: 4px;
}

.pagination-wrapper {
    margin-top: 10px;
    margin-left: 20px;


}
</style>