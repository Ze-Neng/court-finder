# 寻觅球场 — 数据库 Schema 设计参考

> **注意**: 本文档为设计参考，实际建表、建索引、配置安全规则需在 CloudBase 控制台中手动操作。
> CloudBase 使用 NoSQL 文档数据库，集合即为"表"，文档即为"行"，`_id` 由系统自动生成或手动指定。

---

## 1. 枚举类型速查

```typescript
// 运动类型
SportType = 'basketball' | 'table_tennis'

// 球场状态（优先级从高到低）
CourtStatus = 'under_construction' | 'temporarily_closed' | 'verified'
            | 'user_confirmed_available' | 'recent_user_feedback' | 'pending_confirmation'

// 数据来源
DataSource = 'platform_verified' | 'user_verified' | 'initial_entry'

// 收费类型
FeeType = 'free' | 'paid' | 'unknown'

// 用户提交类型
SubmissionType = 'open_normal' | 'under_construction' | 'temporarily_closed'
               | 'cannot_enter' | 'correction' | 'new_court'

// 内容安全状态
SecurityStatus = 'security_passed' | 'security_rejected' | 'security_pending_review'

// 审核状态
ReviewStatus = 'pending_review' | 'approved_no_effect' | 'approved_effective' | 'rejected'

// 风险等级
RiskLevel = 'normal' | 'high'

// 操作类型（admin_logs）
ActionType = 'update_court_status' | 'update_court_field' | 'approve_submission'
           | 'reject_submission' | 'refresh_status' | 'admin_verify'
```

---

## 2. 集合 Schema

### 2.1 `courts` — 正式球场表

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `_id` | string | 自动 | 预生成 `court_001` ~ `court_030` 便于关联 |
| `name` | string | 是 | 球场名称 |
| `sport_types` | SportType[] | 是 | 运动类型数组 |
| `location` | GeoJSON Point | 是 | `{ "type": "Point", "coordinates": [lng, lat] }` |
| `address` | string | 是 | 文本地址 |
| `pilot_area_id` | string | 是 | 试点区域 ID |
| `opening_hours` | string | 否 | 开放时间描述，如 "06:00-22:00" |
| `fee_type` | FeeType | 是 | 收费类型 |
| `facilities` | object | 否 | `{ lighting, surface, hoops_or_goals, toilets }` |
| `current_status` | CourtStatus | 是 | 球场当前状态 |
| `status_reason` | string | 是 | 状态依据说明 |
| `data_source` | DataSource | 是 | 数据来源 |
| `created_at` | ISODate | 是 | 录入时间 |
| `updated_at` | ISODate | 是 | 最后修改时间 |
| `last_verified_at` | ISODate? | 否 | 最近平台核验时间 |
| `last_user_report_at` | ISODate? | 否 | 最近用户有效反馈时间 |
| `last_negative_report_at` | ISODate? | 否 | 最近负面反馈时间 |
| `is_deleted` | boolean | 是 | 软删除标记 |

**索引（6 个）**:

| 索引字段 | 类型 | 用途 |
|----------|------|------|
| `location` | **2dsphere** | 地理空间查询（附近球场、距离排序） |
| `pilot_area_id` | 普通 | 按试点区域筛选 |
| `current_status` | 普通 | 按状态筛选 |
| `is_deleted` | 普通 | 排除已删除球场 |
| `updated_at` | 降序 | 按更新时间排序 |
| `sport_types` + `current_status` | 复合 | 运动类型 + 状态联合筛选 |

---

### 2.2 `user_submissions` — 用户提交表

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `_id` | string | 自动 | 主键 |
| `openid_hash` | string | 是 | 匿名用户标识 |
| `submission_type` | SubmissionType | 是 | 提交类型 |
| `court_id` | string? | 否 | 关联球场 `_id`（新增球场时为空） |
| `content` | string | 是 | 文本内容 |
| `correction_details` | object? | 否 | `{ field, old_value, suggested_value }` |
| `new_court_details` | object? | 否 | `{ name, address, sport_type, location }` |
| `security_status` | SecurityStatus | 是 | 内容安全检测结果 |
| `review_status` | ReviewStatus | 是 | 审核状态 |
| `risk_level` | RiskLevel | 是 | 风险等级 |
| `is_duplicate_of` | string? | 否 | 指向已有有效提交的 `_id`（判重） |
| `created_at` | ISODate | 是 | 提交时间 |
| `reviewed_at` | ISODate? | 否 | 审核时间 |
| `reviewer_openid` | string? | 否 | 审核管理员标识 |
| `review_reason` | string? | 否 | 驳回原因（rejected 时必填） |

**索引（3 个）**:

| 索引字段 | 类型 | 用途 |
|----------|------|------|
| `court_id` + `created_at` | 复合（降序） | 单球场提交历史 |
| `openid_hash` + `court_id` + `submission_type` + `created_at` | 复合（降序） | 频率限制查询 |
| `security_status` + `review_status` | 复合 | 管理员审核队列 |

---

### 2.3 `favorites` — 收藏表

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `_id` | string | 自动 | 主键 |
| `openid_hash` | string | 是 | 匿名用户标识 |
| `court_id` | string | 是 | 关联球场 `_id` |
| `created_at` | ISODate | 是 | 收藏时间 |

**索引（1 个唯一索引）**:

| 索引字段 | 类型 | 用途 |
|----------|------|------|
| `openid_hash` + `court_id` | **唯一索引** | 幂等 toggle，防止重复收藏 |

---

### 2.4 `events` — 埋点事件表

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `_id` | string | 自动 | 主键 |
| `openid_hash` | string | 是 | 匿名用户标识 |
| `event_name` | string | 是 | 事件名称 |
| `court_id` | string? | 否 | 关联球场 `_id` |
| `pilot_area_id` | string | 是 | 试点区域 ID |
| `scene` | number? | 否 | 微信小程序进入场景值 |
| `event_data` | object? | 否 | 附加自由数据 |
| `created_at` | ISODate | 是 | 事件时间 |

**索引（2 个）**:

| 索引字段 | 类型 | 用途 |
|----------|------|------|
| `event_name` + `created_at` | 复合（降序） | 事件类型聚合分析 |
| `openid_hash` + `created_at` | 复合（降序） | 用户行为时间线 |

---

### 2.5 `admin_logs` — 管理员审计表

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `_id` | string | 自动 | 主键 |
| `admin_openid` | string | 是 | 管理员标识 |
| `action_type` | ActionType | 是 | 操作类型 |
| `target_collection` | string | 是 | 操作的集合名称 |
| `target_id` | string | 是 | 操作的文档 `_id` |
| `court_id` | string? | 否 | 关联球场 `_id` |
| `submission_id` | string? | 否 | 关联提交 `_id` |
| `before_data` | object | 是 | 修改前数据 |
| `after_data` | object | 是 | 修改后数据 |
| `reason` | string | 是 | 修改原因 |
| `created_at` | ISODate | 是 | 操作时间 |

**索引（2 个）**:

| 索引字段 | 类型 | 用途 |
|----------|------|------|
| `created_at` | 降序 | 按时间审计 |
| `court_id` + `created_at` | 复合（降序） | 单球场操作历史 |

---

## 3. 操作步骤（CloudBase 控制台）

1. **创建集合**: 在"数据库"面板依次创建 `courts`、`user_submissions`、`favorites`、`events`、`admin_logs`
2. **配置索引**: 在每个集合的"索引管理"中按上表添加索引
3. **设置安全规则**: 在"权限设置"中粘贴 `security-rules.json` 的对应规则
4. **球场数据**: 项目上线后通过小程序内的新增球场流程录入，初始无预置数据
5. **创建管理员白名单集合**: 新建 `admin_whitelist` 集合，插入管理员 `openid_hash` 记录
