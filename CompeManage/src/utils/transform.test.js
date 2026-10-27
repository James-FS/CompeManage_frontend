import { describe, it, expect } from 'vitest'
import { transformObjectKeys } from './transform'

describe('transformObjectKeys', () => {
  it('PascalCase / camelCase 转 snake_case', () => {
    expect(transformObjectKeys({ CompName: 'a', compLevel: 'b' })).toEqual({
      comp_name: 'a',
      comp_level: 'b',
    })
  })

  it('递归转换嵌套对象与数组', () => {
    const input = {
      OuterKey: {
        InnerKey: [ { DeepKey: 1 }, { DeepKey: 2 } ],
      },
    }
    expect(transformObjectKeys(input)).toEqual({
      outer_key: {
        inner_key: [ { deep_key: 1 }, { deep_key: 2 } ],
      },
    })
  })

  it('原样返回原始类型', () => {
    expect(transformObjectKeys(42)).toBe(42)
    expect(transformObjectKeys('str')).toBe('str')
    expect(transformObjectKeys(null)).toBeNull()
  })

  it('已是 snake_case 的键不受影响', () => {
    expect(transformObjectKeys({ already_snake: 1 })).toEqual({ already_snake: 1 })
  })

  it('不修改原始对象（返回新对象）', () => {
    const input = { MyKey: 1 }
    const out = transformObjectKeys(input)
    expect(out).toEqual({ my_key: 1 })
    expect(input).toEqual({ MyKey: 1 })
  })
})
