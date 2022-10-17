/*
 *  Copyright 2021 Collate
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

import classNames from 'classnames';
import { upperCase } from 'lodash';
import { EntityTags } from 'Models';
import React from 'react';
import PopOver from '../components/common/popover/PopOver';
import { FQN_SEPARATOR_CHAR } from '../constants/char.constants';
import {
  getCustomEntityPath,
  getDashboardDetailsPath,
  getDatabaseDetailsPath,
  getDatabaseSchemaDetailsPath,
  getEditWebhookPath,
  getMlModelPath,
  getPipelineDetailsPath,
  getServiceDetailsPath,
  getTableDetailsPath,
  getTopicDetailsPath,
} from '../constants/constants';
import { EntityType, FqnPart } from '../enums/entity.enum';
import { SearchIndex } from '../enums/search.enum';
import { ConstraintTypes, PrimaryTableDataTypes } from '../enums/table.enum';
import { StatusType } from '../generated/entity/data/pipeline';
import { Column, DataType } from '../generated/entity/data/table';
import { TestCaseStatus } from '../generated/tests/testCase';
import { TagLabel } from '../generated/type/tagLabel';
import {
  getPartialNameFromTableFQN,
  getTableFQNFromColumnFQN,
} from './CommonUtils';
import { getGlossaryPath } from './RouterUtils';
import { ordinalize } from './StringsUtils';
import SVGIcons, { Icons } from './SvgUtils';

export const getBadgeName = (tableType?: string) => {
  switch (tableType) {
    case 'REGULAR':
      return 'table';
    case 'QUERY':
      return 'query';
    default:
      return 'table';
  }
};

export const usageSeverity = (value: number): string => {
  if (value > 75) {
    return 'High';
  } else if (value >= 25 && value <= 75) {
    return 'Medium';
  } else {
    return 'Low';
  }
};

export const getUsagePercentile = (pctRank: number, isLiteral = false) => {
  const percentile = Math.round(pctRank * 10) / 10;
  const ordinalPercentile = ordinalize(percentile);
  const usagePercentile = `${
    isLiteral ? 'Usage' : ''
  } - ${ordinalPercentile} pctile`;

  return usagePercentile;
};

export const getTierFromTableTags = (
  tags: Array<EntityTags>
): EntityTags['tagFQN'] => {
  const tierTag = tags.find(
    (item) =>
      item.tagFQN.startsWith(`Tier${FQN_SEPARATOR_CHAR}Tier`) &&
      !isNaN(parseInt(item.tagFQN.substring(9).trim()))
  );

  return tierTag?.tagFQN || '';
};

export const getTierTags = (tags: Array<TagLabel>) => {
  const tierTag = tags.find(
    (item) =>
      item.tagFQN.startsWith(`Tier${FQN_SEPARATOR_CHAR}Tier`) &&
      !isNaN(parseInt(item.tagFQN.substring(9).trim()))
  );

  return tierTag;
};

export const getTagsWithoutTier = (
  tags: Array<EntityTags>
): Array<EntityTags> => {
  return tags.filter(
    (item) =>
      !item.tagFQN.startsWith(`Tier${FQN_SEPARATOR_CHAR}Tier`) ||
      isNaN(parseInt(item.tagFQN.substring(9).trim()))
  );
};

export const getTierFromSearchTableTags = (tags: Array<string>): string => {
  const tierTag = tags.find(
    (item) =>
      item.startsWith(`Tier${FQN_SEPARATOR_CHAR}Tier`) &&
      !isNaN(parseInt(item.substring(9).trim()))
  );

  return tierTag || '';
};

export const getSearchTableTagsWithoutTier = (
  tags: Array<string>
): Array<string> => {
  return tags.filter(
    (item) =>
      !item.startsWith(`Tier${FQN_SEPARATOR_CHAR}Tier`) ||
      isNaN(parseInt(item.substring(9).trim()))
  );
};

export const getConstraintIcon = (constraint = '', className = '') => {
  let title: string, icon: string;
  switch (constraint) {
    case ConstraintTypes.PRIMARY_KEY:
      {
        title = 'Primary key';
        icon = Icons.KEY;
      }

      break;
    case ConstraintTypes.UNIQUE:
      {
        title = 'Unique';
        icon = Icons.UNIQUE;
      }

      break;
    case ConstraintTypes.NOT_NULL:
      {
        title = 'Not null';
        icon = Icons.NOT_NULL;
      }

      break;
    case ConstraintTypes.FOREIGN_KEY:
      {
        title = 'Foreign key';
        icon = Icons.FOREGIN_KEY;
      }

      break;
    default:
      return null;
  }

  return (
    <PopOver
      className={classNames(className)}
      position="bottom"
      size="small"
      title={title}
      trigger="mouseenter">
      <SVGIcons alt={title} icon={icon} width="16px" />
    </PopOver>
  );
};

export const getEntityLink = (
  indexType: string,
  fullyQualifiedName: string
) => {
  // encode the FQN for entities that can have "/" in their names
  fullyQualifiedName = encodeURIComponent(fullyQualifiedName);
  switch (indexType) {
    case SearchIndex.TOPIC:
    case EntityType.TOPIC:
      return getTopicDetailsPath(fullyQualifiedName);

    case SearchIndex.DASHBOARD:
    case EntityType.DASHBOARD:
      return getDashboardDetailsPath(fullyQualifiedName);

    case SearchIndex.PIPELINE:
    case EntityType.PIPELINE:
      return getPipelineDetailsPath(fullyQualifiedName);

    case EntityType.DATABASE:
      return getDatabaseDetailsPath(fullyQualifiedName);

    case EntityType.DATABASE_SCHEMA:
      return getDatabaseSchemaDetailsPath(fullyQualifiedName);

    case EntityType.GLOSSARY:
    case EntityType.GLOSSARY_TERM:
      return getGlossaryPath(fullyQualifiedName);

    case EntityType.DATABASE_SERVICE:
    case EntityType.DASHBOARD_SERVICE:
    case EntityType.MESSAGING_SERVICE:
    case EntityType.PIPELINE_SERVICE:
      return getServiceDetailsPath(fullyQualifiedName, `${indexType}s`);

    case EntityType.WEBHOOK:
      return getEditWebhookPath(fullyQualifiedName);

    case EntityType.TYPE:
      return getCustomEntityPath(fullyQualifiedName);

    case EntityType.MLMODEL:
    case SearchIndex.MLMODEL:
      return getMlModelPath(fullyQualifiedName);

    case SearchIndex.TABLE:
    case EntityType.TABLE:
    default:
      return getTableDetailsPath(fullyQualifiedName);
  }
};

export const getEntityIcon = (indexType: string) => {
  let icon = '';
  switch (indexType) {
    case SearchIndex.TOPIC:
    case EntityType.TOPIC:
      icon = 'topic-grey';

      break;

    case SearchIndex.DASHBOARD:
    case EntityType.DASHBOARD:
      icon = 'dashboard-grey';

      break;
    case SearchIndex.MLMODEL:
    case EntityType.MLMODEL:
      icon = 'mlmodel-grey';

      break;
    case SearchIndex.PIPELINE:
    case EntityType.PIPELINE:
      icon = 'pipeline-grey';

      break;
    case SearchIndex.TABLE:
    case EntityType.TABLE:
    default:
      icon = 'table-grey';

      break;
  }

  return <SVGIcons alt={icon} icon={icon} width="14" />;
};

export const makeRow = (column: Column) => {
  return {
    description: column.description || '',
    tags: column?.tags || [],
    key: column?.name,
    ...column,
  };
};

export const makeData = (
  columns: Column[] = []
): Array<Column & { subRows: Column[] | undefined }> => {
  return columns.map((column) => ({
    ...makeRow(column),
    subRows: column.children ? makeData(column.children) : undefined,
  }));
};

export const getDataTypeString = (dataType: string): string => {
  switch (upperCase(dataType)) {
    case DataType.String:
    case DataType.Char:
    case DataType.Text:
    case DataType.Varchar:
    case DataType.Mediumtext:
    case DataType.Mediumblob:
    case DataType.Blob:
      return PrimaryTableDataTypes.VARCHAR;
    case DataType.Timestamp:
    case DataType.Time:
      return PrimaryTableDataTypes.TIMESTAMP;
    case DataType.Date:
      return PrimaryTableDataTypes.DATE;
    case DataType.Int:
    case DataType.Float:
    case DataType.Smallint:
    case DataType.Bigint:
    case DataType.Numeric:
    case DataType.Tinyint:
    case DataType.Decimal:
      return PrimaryTableDataTypes.NUMERIC;
    case DataType.Boolean:
    case DataType.Enum:
      return PrimaryTableDataTypes.BOOLEAN;
    default:
      return dataType;
  }
};

export const generateEntityLink = (fqn: string, includeColumn = false) => {
  const columnLink = '<#E::table::ENTITY_FQN::columns::COLUMN>';
  const tableLink = '<#E::table::ENTITY_FQN>';

  if (includeColumn) {
    const tableFqn = getTableFQNFromColumnFQN(fqn);
    const columnName = getPartialNameFromTableFQN(fqn, [FqnPart.NestedColumn]);

    return columnLink
      .replace('ENTITY_FQN', tableFqn)
      .replace('COLUMN', columnName);
  } else {
    return tableLink.replace('ENTITY_FQN', fqn);
  }
};

export const getEntityFqnFromEntityLink = (
  entityLink: string,
  includeColumn = false
) => {
  const link = entityLink.split('>')[0];
  const entityLinkData = link.split('::');
  const tableFqn = entityLinkData[2];

  if (includeColumn) {
    return `${tableFqn}.${entityLinkData[entityLinkData.length - 1]}`;
  }

  return tableFqn;
};

export const getTestResultBadgeIcon = (status?: TestCaseStatus) => {
  switch (status) {
    case TestCaseStatus.Success:
      return Icons.SUCCESS_BADGE;

    case TestCaseStatus.Failed:
      return Icons.FAIL_BADGE;

    case TestCaseStatus.Aborted:
      return Icons.PENDING_BADGE;

    default:
      return '';
  }
};

export const getStatusBadgeIcon = (status?: string) => {
  switch (status) {
    case StatusType.Successful:
      return Icons.SUCCESS_BADGE;

    case TestCaseStatus.Failed:
      return Icons.FAIL_BADGE;

    case TestCaseStatus.Aborted:
      return Icons.PENDING_BADGE;

    default:
      return '';
  }
};
