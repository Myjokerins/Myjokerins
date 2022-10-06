ALTER TABLE entity_extension_time_series ALTER COLUMN entityFQN TYPE varchar(768);
CREATE INDEX IF NOT EXISTS entity_extension_time_series_entity_fqn_index ON entity_extension_time_series(entityFQN);
