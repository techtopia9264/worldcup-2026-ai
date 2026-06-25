# dud 组件库已知问题

## Badge: forwardRef 警告

**症状**：
```
Warning: Function components cannot be given refs. Attempts to access this ref will fail.
Did you mean to use React.forwardRef()?
Check the render method of `Primitive.div.Slot`.
```

**原因**：
`Badge` 组件内部使用 Radix `Slot`，当子组件不支持 `forwardRef` 时触发此警告。纯文本作为 children 时不触发，但传入无 `forwardRef` 的组件时会出现。

**影响范围**：`<Badge variant="secondary">` 等所有 variant。

**复现文件**：`MatchCard.tsx`、`TrajectoryDialog.tsx`

**状态**：待修复（需在 dud 库中处理 Slot 的 ref 转发逻辑）
