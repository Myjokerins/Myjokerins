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

import { Card, Col, Row, Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { OVERVIEW } from '../../pages/DataInsightPage/DataInsight.mock';
import './DataInsightDetail.less';

const DataInsightSummary = () => {
  const { t } = useTranslation();

  return (
    <Card
      className="data-insight-card"
      data-testid="summary-card"
      title={
        <Typography.Title level={5}>
          {t('label.data-insight-summary')}
        </Typography.Title>
      }>
      <Row data-testid="summary-card-content" gutter={[16, 16]}>
        {OVERVIEW.map((summary, id) => (
          <Col data-testid="summary-item" key={id} span={4}>
            <Typography.Text>{summary.entityType}</Typography.Text>
            <Typography className="tw-font-semibold">
              {summary.count}
            </Typography>
          </Col>
        ))}
      </Row>
    </Card>
  );
};

export default DataInsightSummary;
