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

import React from 'react';
import { Redirect, Route, Switch } from 'react-router-dom';
import { usePermissionProvider } from '../components/PermissionProvider/PermissionProvider';
import { ResourceEntity } from '../components/PermissionProvider/PermissionProvider.interface';
import {
  GlobalSettingOptions,
  GlobalSettingsMenuCategory,
} from '../constants/globalSettings.constants';
import { TeamType } from '../generated/entity/teams/team';
import ActivityFeedSettingsPage from '../pages/ActivityFeedSettingsPage/ActivityFeedSettingsPage';
import TeamsPage from '../pages/teams/TeamsPage';
import { userPermissions } from '../utils/PermissionsUtils';
import {
  getSettingCategoryPath,
  getSettingPath,
  getTeamsWithFqnPath,
} from '../utils/RouterUtils';
import AdminProtectedRoute from './AdminProtectedRoute';
import withSuspenseFallback from './withSuspenseFallback';

const WebhooksPageV1 = withSuspenseFallback(
  React.lazy(() => import('../pages/WebhooksPage/WebhooksPageV1.component'))
);
const ServicesPage = withSuspenseFallback(
  React.lazy(() => import('../pages/services/ServicesPage'))
);
const BotsPageV1 = withSuspenseFallback(
  React.lazy(() => import('../pages/BotsPageV1/BotsPageV1.component'))
);
const CustomPropertiesPageV1 = withSuspenseFallback(
  React.lazy(
    () => import('../pages/CustomPropertiesPageV1/CustomPropertiesPageV1')
  )
);
const RolesListPage = withSuspenseFallback(
  React.lazy(() => import('../pages/RolesPage/RolesListPage/RolesListPage'))
);
const RolesDetailPage = withSuspenseFallback(
  React.lazy(() => import('../pages/RolesPage/RolesDetailPage/RolesDetailPage'))
);

const PoliciesDetailPage = withSuspenseFallback(
  React.lazy(
    () => import('../pages/PoliciesPage/PoliciesDetailPage/PoliciesDetailPage')
  )
);
const PoliciesListPage = withSuspenseFallback(
  React.lazy(
    () => import('../pages/PoliciesPage/PoliciesListPage/PoliciesListPage')
  )
);

const UserListPageV1 = withSuspenseFallback(
  React.lazy(() => import('../pages/UserListPage/UserListPageV1'))
);
const SlackSettingsPage = withSuspenseFallback(
  React.lazy(
    () => import('../pages/SlackSettingsPage/SlackSettingsPage.component')
  )
);
const MsTeamsPage = withSuspenseFallback(
  React.lazy(() => import('../pages/MsTeamsPage/MsTeamsPage.component'))
);
const ElasticSearchIndexPage = withSuspenseFallback(
  React.lazy(
    () =>
      import(
        '../pages/ElasticSearchIndexPage/ElasticSearchReIndexPage.component'
      )
  )
);

const GlobalSettingRouter = () => {
  const { permissions } = usePermissionProvider();

  return (
    <Switch>
      <Route exact path={getSettingPath()}>
        <Redirect to={getTeamsWithFqnPath(TeamType.Organization)} />
      </Route>
      <Route
        exact
        component={TeamsPage}
        path={getSettingPath(
          GlobalSettingsMenuCategory.MEMBERS,
          GlobalSettingOptions.TEAMS
        )}
      />
      <Route
        exact
        component={TeamsPage}
        path={getSettingPath(
          GlobalSettingsMenuCategory.MEMBERS,
          GlobalSettingOptions.TEAMS,
          true
        )}
      />
      {/* Roles route start
       * Do not change the order of these route
       */}
      <AdminProtectedRoute
        exact
        component={RolesListPage}
        hasPermission={userPermissions.hasViewPermissions(
          ResourceEntity.ROLE,
          permissions
        )}
        path={getSettingPath(
          GlobalSettingsMenuCategory.ACCESS,
          GlobalSettingOptions.ROLES
        )}
      />

      <Route
        exact
        component={RolesDetailPage}
        path={getSettingPath(
          GlobalSettingsMenuCategory.ACCESS,
          GlobalSettingOptions.ROLES,
          true
        )}
      />
      {/* Roles route end
       * Do not change the order of these route
       */}

      <AdminProtectedRoute
        exact
        component={PoliciesListPage}
        hasPermission={userPermissions.hasViewPermissions(
          ResourceEntity.POLICY,
          permissions
        )}
        path={getSettingPath(
          GlobalSettingsMenuCategory.ACCESS,
          GlobalSettingOptions.POLICIES
        )}
      />
      <Route
        exact
        component={PoliciesDetailPage}
        path={getSettingPath(
          GlobalSettingsMenuCategory.ACCESS,
          GlobalSettingOptions.POLICIES,
          true
        )}
      />
      <AdminProtectedRoute
        exact
        component={UserListPageV1}
        hasPermission={userPermissions.hasViewPermissions(
          ResourceEntity.USER,
          permissions
        )}
        path={getSettingCategoryPath(GlobalSettingsMenuCategory.MEMBERS)}
      />

      <AdminProtectedRoute
        exact
        component={WebhooksPageV1}
        hasPermission={userPermissions.hasViewPermissions(
          ResourceEntity.WEBHOOK,
          permissions
        )}
        path={getSettingPath(
          GlobalSettingsMenuCategory.INTEGRATIONS,
          GlobalSettingOptions.WEBHOOK
        )}
      />
      <AdminProtectedRoute
        exact
        component={BotsPageV1}
        hasPermission={userPermissions.hasViewPermissions(
          ResourceEntity.BOT,
          permissions
        )}
        path={getSettingPath(
          GlobalSettingsMenuCategory.INTEGRATIONS,
          GlobalSettingOptions.BOTS
        )}
      />

      <AdminProtectedRoute
        exact
        component={SlackSettingsPage}
        hasPermission={userPermissions.hasViewPermissions(
          ResourceEntity.WEBHOOK,
          permissions
        )}
        path={getSettingPath(
          GlobalSettingsMenuCategory.INTEGRATIONS,
          GlobalSettingOptions.SLACK
        )}
      />
      <AdminProtectedRoute
        exact
        // Currently we don't have any permission related to ActivityFeed settings page
        // update below once we have it
        component={ActivityFeedSettingsPage}
        hasPermission={userPermissions.hasViewPermissions(
          ResourceEntity.FEED,
          permissions
        )}
        path={getSettingPath(
          GlobalSettingsMenuCategory.COLLABORATION,
          GlobalSettingOptions.ACTIVITY_FEED
        )}
      />
      <AdminProtectedRoute
        exact
        component={MsTeamsPage}
        hasPermission={userPermissions.hasViewPermissions(
          ResourceEntity.WEBHOOK,
          permissions
        )}
        path={getSettingPath(
          GlobalSettingsMenuCategory.INTEGRATIONS,
          GlobalSettingOptions.MSTEAMS
        )}
      />

      <AdminProtectedRoute
        exact
        component={ElasticSearchIndexPage}
        hasPermission={userPermissions.hasViewPermissions(
          ResourceEntity.ALL,
          permissions
        )}
        path={getSettingPath(
          GlobalSettingsMenuCategory.EVENT_PUBLISHERS,
          GlobalSettingOptions.ELASTIC_SEARCH
        )}
      />

      <Route
        exact
        component={ServicesPage}
        path={getSettingCategoryPath(GlobalSettingsMenuCategory.SERVICES)}
      />

      <AdminProtectedRoute
        exact
        component={CustomPropertiesPageV1}
        hasPermission={userPermissions.hasViewPermissions(
          ResourceEntity.TYPE,
          permissions
        )}
        path={getSettingCategoryPath(
          GlobalSettingsMenuCategory.CUSTOM_ATTRIBUTES
        )}
      />
    </Switch>
  );
};

export default GlobalSettingRouter;
