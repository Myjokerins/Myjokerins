ALTER TABLE `entity_extension_time_series` modify entityFQN varchar(768);
ALTER TABLE `entity_extension_time_series` ADD INDEX `entity_fqn_index` (`entityFQN`);
