/*
 *  Copyright 2022 Collate
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *  http://www.apache.org/licenses/LICENSE-2.0
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import { ResourceEntity } from '../components/PermissionProvider/PermissionProvider.interface';

export const customAttributesPath = {
  tables: 'table',
  topics: 'topic',
  dashboards: 'dashboard',
  pipelines: 'pipeline',
  mlModels: 'mlmodel',
};

export enum GlobalSettingsMenuCategory {
  ACCESS = 'access',
  COLLABORATION = 'collaboration',
  CUSTOM_ATTRIBUTES = 'customAttributes',
  DATA_QUALITY = 'dataQuality',
  EVENT_PUBLISHERS = 'eventPublishers',
  INTEGRATIONS = 'integrations',
  MEMBERS = 'members',
  SERVICES = 'services',
}

export enum GlobalSettingOptions {
  USERS = 'users',
  ADMINS = 'admins',
  TEAMS = 'teams',
  ROLES = 'roles',
  POLICIES = 'policies',
  DATABASES = 'databases',
  MESSAGING = 'messaging',
  DASHBOARDS = 'dashboards',
  PIPELINES = 'pipelines',
  MLMODELS = 'mlModels',
  WEBHOOK = 'webhook',
  SLACK = 'slack',
  BOTS = 'bots',
  TABLES = 'tables',
  MSTEAMS = 'msteams',
  ACTIVITY_FEED = 'activityFeed',
  ELASTIC_SEARCH = 'elasticSearch',
}

export const GLOBAL_SETTING_PERMISSION_RESOURCES = [
  ResourceEntity.TEAM,
  ResourceEntity.USER,
  ResourceEntity.ROLE,
  ResourceEntity.POLICY,
  ResourceEntity.DATABASE_SERVICE,
  ResourceEntity.MESSAGING_SERVICE,
  ResourceEntity.DASHBOARD_SERVICE,
  ResourceEntity.PIPELINE_SERVICE,
  ResourceEntity.ML_MODEL_SERVICE,
  ResourceEntity.TYPE,
  ResourceEntity.WEBHOOK,
  ResourceEntity.BOT,
];
