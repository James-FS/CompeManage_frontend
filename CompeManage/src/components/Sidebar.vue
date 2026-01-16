<script setup>
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();

//定义菜单项
const menuItems = ref([
    {
        path: '/home',
        title: '首页',
        icon: 'House'
    },
    {
        path: '/competition',
        title: '竞赛管理',
        icon: 'Trophy',
        children: [
            { path: '/competition/list', title: '竞赛列表' },
            { path: '/competition/add', title: '添加竞赛' }
        ]
    },
    {
        path: '/student',
        title: '学生管理',
        icon: 'User'
    },
    {
        path: '/statistics',
        title: '数据统计',
        icon: 'DataAnalysis'
    },
]);

//是否折叠
const isCollapsed = ref(false);

//切换折叠状态
const toggleCollapse = () => {
    isCollapsed.value = !isCollapsed.value;
};

// 当前激活的菜单
const activeMenu = ref(route.path)

// 菜单点击事件
const handleMenuSelect = (path) => {
    router.push(path)
}
</script>

