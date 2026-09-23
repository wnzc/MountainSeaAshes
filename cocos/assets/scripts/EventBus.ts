/**
 * 统一事件总线 — 对齐 Godot / Cocos core.EventBus
 * 避免 scripts/ 与 scripts/core/ 双实现导致冲突
 */
export { EventBus, bus } from './core/EventBus';
