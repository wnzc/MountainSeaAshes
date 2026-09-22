extends Node
## 全局事件总线（对应技术文档 autoload/event_bus.gd）
## 只广播“事实已发生”，不发业务命令。

signal enemy_spawned(enemy)
signal enemy_died(enemy, reward)
signal base_damaged(amount)
signal gold_changed(value)
signal base_hp_changed(value, max_value)
signal spirit_placed(spirit, slot_id)
signal spirit_upgraded(spirit)
signal element_applied(target, element)
signal reaction_triggered(reaction_id, position, context)
signal chain_reached(level, context)
signal wave_started(index)
signal wave_completed(index)
signal battle_finished(victory)
signal slot_selected(slot_id)
signal card_selected(spirit_id)
signal toast(message)
