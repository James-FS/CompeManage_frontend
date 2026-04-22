import axios from 'axios'
import { ElMessage } from 'element-plus'

// 配置后端服务器地址
const baseURL = 'http://localhost:8080' // 开发环境

// 创建 axios 实例
const service = axios.create({
  baseURL,
  timeout: 10000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    const res = response.data
    const isLoginRequest = response.config?.url?.includes('/api/login')
    
    // 根据后端返回的数据结构进行处理
    // 后端可能返回 { code, msg, data } 或 { code, message, data }
    if (res.code !== undefined && res.code !== 200 && res.code !== 0) {
      const errorMsg = res.message || res.msg || '请求失败'

      // 登录接口返回 401 时，交给登录页提示账号/密码错误，不做过期跳转
      if (res.code === 401 && isLoginRequest) {
        return Promise.reject(new Error(errorMsg || '账号或密码错误'))
      }

      ElMessage.error(errorMsg)

      // 401 未授权，清除 token 并跳转到登录页
      if (res.code === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
        window.location.href = '/login'
      }
      
      return Promise.reject(new Error(errorMsg))
    }
    
    return res
  },
  (error) => {
    console.error('响应错误:', error)
    const isLoginRequest = error.config?.url?.includes('/api/login')
    
    if (error.response) {
      const { status, data } = error.response
      
      if (status === 401 && isLoginRequest) {
        return Promise.reject(new Error(data?.message || '账号或密码错误'))
      }

      if (status === 401) {
        ElMessage.error('未登录或登录已过期，请重新登录')
        localStorage.removeItem('token')
        localStorage.removeItem('userInfo')
        window.location.href = '/login'
      } else if (status === 403) {
        ElMessage.error('没有权限访问该资源')
      } else if (status === 404) {
        ElMessage.error('请求的资源不存在')
      } else if (status === 500) {
        ElMessage.error('服务器内部错误')
      } else {
        ElMessage.error(data?.message || data?.msg || error.message || '请求失败')
      }
    } else if (error.request) {
      ElMessage.error('网络错误，请检查网络连接')
    } else {
      ElMessage.error(error.message || '请求失败')
    }
    
    return Promise.reject(error)
  }
)

// 封装请求方法
export const request = (options) => {
  return service(options)
}

export const get = (url, params = {}, config = {}) => {
  return service({
    url,
    method: 'GET',
    params,
    ...config
  })
}

export const post = (url, data = {}, config = {}) => {
  return service({
    url,
    method: 'POST',
    data,
    ...config
  })
}

export const put = (url, data = {}, config = {}) => {
  return service({
    url,
    method: 'PUT',
    data,
    ...config
  })
}

export const del = (url, data = {}, config = {}) => {
  return service({
    url,
    method: 'DELETE',
    data,
    ...config
  })
}

export default service
