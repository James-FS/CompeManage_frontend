<script setup>
import { ElTable,ElTableColumn } from 'element-plus';
import { ref } from 'vue';
let noticeList=ref([{ id: 1, title: '关于举办广州大学第二十届ACM大学生程序设计竞赛的通知', date: '2026-01-16', dept: '教务处', tag: '置顶', tagType: 'danger' },
    { id: 2, title: '第十五届“蓝桥杯”全国软件和信息技术专业人才大赛报名通知', date: '2026-02-10', dept: '计算机学院', tag: '热点', tagType: 'warning' },
    { id: 3, title: '2026年大学生创新创业训练计划项目申报指南', date: '2026-03-05', dept: '创新创业学院', tag: '通知', tagType: 'info' },
    { id: 4, title: '关于开展2026年度学科竞赛获奖统计工作的通知', date: '2026-03-12', dept: '教务处', tag: '', tagType: '' },
    { id: 5, title: '2026年全国大学生英语竞赛(NECCS)报名通知', date: '2026-04-01', dept: '外国语学院', tag: '', tagType: '' },]);
</script>

<template>
    <div class="page-container">
        <div class="list-container">
            <div class="list-header">
                <div class="header-title">
                    赛事通知列表
                </div>
            </div>
            <div class="list-body">
                <el-table :data="noticeList"
                style="width: 100%;"
                :header-cell-style="{ background: '#f8fafc', color: '#64748b', height: '50px' }"
                class="list-table"
                >
                <el-table-column
                    prop="title"
                    label="通知标题"
                    min-width="400"
                />
                <el-table-column
                    prop="date"
                    label="发布日期"
                    width="180"
                    align="right"
                />
                </el-table>
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
    background-color: #f0fdfa; /* 基础底色 */
    /* 两个巨大的径向渐变光晕 */
    background-image: 
        radial-gradient(at 0% 0%, rgba(19, 194, 194, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(59, 130, 246, 0.1) 0px, transparent 50%);
        
    /* 这种背景通常不需要 repeat，覆盖全屏即可 */
    background-repeat: no-repeat;
    background-attachment: fixed; /* 滚动时背景不动，很高级 */
    .list-container{
        display: flex;
        flex-direction: column;
        height: 70%;
        align-items: stretch;
        background-color: #fff;
        border-radius: 16px;
        padding:30px;
        min-height: 600px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
        .list-header{
            display: flex;
            flex-direction: row;
            justify-content: flex-start;
            align-items: center;
            border-left: 4px solid #13C2C2;
            padding-left: 12px;
            margin-bottom: 30px;
            .header-title{
                font-size:20px;
                font-weight:600;
                color:#333;
            }
        }
    }
}
</style>