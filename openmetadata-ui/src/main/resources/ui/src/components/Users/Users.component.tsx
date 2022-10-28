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

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { Card, Image, Space, Switch, Typography } from 'antd';
import { AxiosError } from 'axios';
import { capitalize, isEmpty, isEqual, isNil, toLower } from 'lodash';
import { observer } from 'mobx-react';
import React, {
  Fragment,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useHistory, useLocation } from 'react-router-dom';
import Select from 'react-select';
import { useAuthContext } from '../../authentication/auth-provider/AuthProvider';
import { changePassword } from '../../axiosAPIs/auth-API';
import { getRoles } from '../../axiosAPIs/rolesAPIV1';
import { getTeams } from '../../axiosAPIs/teamsAPI';
import {
  getUserPath,
  PAGE_SIZE_LARGE,
  TERM_ADMIN,
} from '../../constants/constants';
import { observerOptions } from '../../constants/Mydata.constants';
import {
  getUserCurrentTab,
  profileInfo,
  USER_PROFILE_TABS,
} from '../../constants/usersprofile.constants';
import { FeedFilter } from '../../enums/mydata.enum';
import { AuthTypes } from '../../enums/signin.enum';
import {
  ChangePasswordRequest,
  RequestType,
} from '../../generated/auth/changePasswordRequest';
import { ThreadType } from '../../generated/entity/feed/thread';
import { Role } from '../../generated/entity/teams/role';
import { Team } from '../../generated/entity/teams/team';
import { EntityReference } from '../../generated/entity/teams/user';
import { Paging } from '../../generated/type/paging';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import jsonData from '../../jsons/en';
import UserCard from '../../pages/teams/UserCard';
import { getEntityName, getNonDeletedTeams } from '../../utils/CommonUtils';
import { filterEntityAssets } from '../../utils/EntityUtils';
import {
  getImageWithResolutionAndFallback,
  ImageQuality,
} from '../../utils/ProfilerUtils';
import { dropdownIcon as DropDownIcon } from '../../utils/svgconstant';
import SVGIcons, { Icons } from '../../utils/SvgUtils';
import { showErrorToast, showSuccessToast } from '../../utils/ToastUtils';
import ActivityFeedList from '../ActivityFeed/ActivityFeedList/ActivityFeedList';
import { filterListTasks } from '../ActivityFeed/ActivityFeedList/ActivityFeedList.util';
import { Button } from '../buttons/Button/Button';
import Description from '../common/description/Description';
import ProfilePicture from '../common/ProfilePicture/ProfilePicture';
import { reactSingleSelectCustomStyle } from '../common/react-select-component/reactSelectCustomStyle';
import TabsPane from '../common/TabsPane/TabsPane';
import { leftPanelAntCardStyle } from '../containers/PageLayout';
import PageLayoutV1 from '../containers/PageLayoutV1';
import DropDownList from '../dropdown/DropDownList';
import Loader from '../Loader/Loader';
import ChangePasswordForm from './ChangePasswordForm';
import { Option, Props } from './Users.interface';
import { userPageFilterList } from './Users.util';

const Users = ({
  userData,
  feedData,
  isFeedLoading,
  postFeedHandler,
  deletePostHandler,
  fetchFeedHandler,
  paging,
  updateUserDetails,
  isAdminUser,
  isLoggedinUser,
  isAuthDisabled,
  updateThreadHandler,
  username,
  tab,
  feedFilter,
  setFeedFilter,
  threadType,
  onSwitchChange,
}: Props) => {
  const [activeTab, setActiveTab] = useState(getUserCurrentTab(tab));
  const [elementRef, isInView] = useInfiniteScroll(observerOptions);
  const [displayName, setDisplayName] = useState(userData.displayName);
  const [isDisplayNameEdit, setIsDisplayNameEdit] = useState(false);
  const [isDescriptionEdit, setIsDescriptionEdit] = useState(false);
  const [isRolesEdit, setIsRolesEdit] = useState(false);
  const [isTeamsEdit, setIsTeamsEdit] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Array<Option>>([]);
  const [selectedTeams, setSelectedTeams] = useState<Array<Option>>([]);
  const [teams, setTeams] = useState<Array<Team>>([]);
  const [roles, setRoles] = useState<Array<Role>>([]);
  const history = useHistory();
  const [showFilterList, setShowFilterList] = useState(false);
  const [isImgUrlValid, SetIsImgUrlValid] = useState<boolean>(true);
  const [isChangePassword, setIsChangePassword] = useState<boolean>(false);
  const location = useLocation();
  const isTaskType = isEqual(threadType, ThreadType.Task);
  const [isLoading, setIsLoading] = useState(false);

  const { authConfig } = useAuthContext();
  const { t } = useTranslation();

  const { isAuthProviderBasic } = useMemo(() => {
    return {
      isAuthProviderBasic:
        authConfig?.provider === AuthTypes.BASIC ||
        authConfig?.provider === AuthTypes.LDAP,
    };
  }, [authConfig]);

  const handleFilterDropdownChange = useCallback(
    (_e: React.MouseEvent<HTMLElement, MouseEvent>, value?: string) => {
      if (value) {
        fetchFeedHandler(threadType, undefined, value as FeedFilter);
        setFeedFilter(value as FeedFilter);
      }
      setShowFilterList(false);
    },
    [threadType, fetchFeedHandler]
  );

  const fetchTeams = () => {
    getTeams(['users'])
      .then((res) => {
        if (res.data) {
          setTeams(res.data);
        } else {
          throw jsonData['api-error-messages']['unexpected-server-response'];
        }
      })
      .catch((err: AxiosError) => {
        showErrorToast(
          err,
          jsonData['api-error-messages']['fetch-teams-error']
        );
      });
  };

  const onDisplayNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayName(e.target.value);
  };

  const activeTabHandler = (tabNum: number) => {
    setFeedFilter(tabNum === 1 ? FeedFilter.ALL : FeedFilter.OWNER);
    setActiveTab(tabNum);
    // To reset search params appends from other page for proper navigation
    location.search = '';
    if (profileInfo[tabNum - 1].path !== tab) {
      history.push({
        pathname: getUserPath(username, profileInfo[tabNum - 1].path),
        search: location.search,
      });
    }
  };

  const handleDisplayNameChange = () => {
    if (displayName !== userData.displayName) {
      updateUserDetails({ displayName: displayName || '' });
    }
    setIsDisplayNameEdit(false);
  };

  const handleDescriptionChange = async (description: string) => {
    await updateUserDetails({ description });

    setIsDescriptionEdit(false);
  };

  const handleRolesChange = () => {
    // filter out the roles , and exclude the admin one
    const updatedRoles = selectedRoles.filter(
      (role) => role.value !== toLower(TERM_ADMIN)
    );

    // get the admin role and send it as boolean value `isAdmin=Boolean(isAdmin)
    const isAdmin = selectedRoles.find(
      (role) => role.value === toLower(TERM_ADMIN)
    );
    updateUserDetails({
      roles: updatedRoles.map((item) => {
        const roleId = item.value;
        const role = roles.find((r) => r.id === roleId);

        return { id: roleId, type: 'role', name: role?.name || '' };
      }),
      isAdmin: Boolean(isAdmin),
    });

    setIsRolesEdit(false);
  };
  const handleTeamsChange = () => {
    updateUserDetails({
      teams: selectedTeams.map((item) => {
        const teamId = item.value;
        const team = teams.find((t) => t.id === teamId);

        return { id: teamId, type: 'team', name: team?.name || '' };
      }),
    });

    setIsTeamsEdit(false);
  };

  const handleOnRolesChange = (
    value: unknown,
    { action }: { action: string }
  ) => {
    if (isNil(value) || action === 'clear') {
      setSelectedRoles([]);
    } else {
      setSelectedRoles(value as Option[]);
    }
  };
  const handleOnTeamsChange = (
    value: unknown,
    { action }: { action: string }
  ) => {
    if (isNil(value) || action === 'clear') {
      setSelectedTeams([]);
    } else {
      setSelectedTeams(value as Option[]);
    }
  };

  const handleChangePassword = async (data: ChangePasswordRequest) => {
    try {
      setIsLoading(true);
      const sendData = {
        ...data,
        ...(isAdminUser &&
          !isLoggedinUser && {
            username: userData.name,
            requestType: RequestType.User,
          }),
      };
      await changePassword(sendData);
      setIsChangePassword(false);
      showSuccessToast(
        jsonData['api-success-messages']['update-password-success']
      );
    } catch (err) {
      showErrorToast(err as AxiosError);
    } finally {
      setIsLoading(true);
    }
  };

  useEffect(() => {
    setActiveTab(getUserCurrentTab(tab));
  }, [tab]);

  const getDisplayNameComponent = () => {
    if (isAdminUser || isLoggedinUser || isAuthDisabled) {
      return (
        <div className="tw-w-full">
          {isDisplayNameEdit ? (
            <Space className="tw-w-full" direction="vertical">
              <input
                className="tw-form-inputs tw-form-inputs-padding tw-py-0.5 tw-w-full"
                data-testid="displayName"
                id="displayName"
                name="displayName"
                placeholder="displayName"
                type="text"
                value={displayName}
                onChange={onDisplayNameChange}
              />
              <div className="tw-flex tw-justify-end" data-testid="buttons">
                <Button
                  className="tw-px-1 tw-py-1 tw-rounded tw-text-sm tw-mr-1"
                  data-testid="cancel-displayName"
                  size="custom"
                  theme="primary"
                  variant="contained"
                  onMouseDown={() => setIsDisplayNameEdit(false)}>
                  <FontAwesomeIcon className="tw-w-3.5 tw-h-3.5" icon="times" />
                </Button>
                <Button
                  className="tw-px-1 tw-py-1 tw-rounded tw-text-sm"
                  data-testid="save-displayName"
                  size="custom"
                  theme="primary"
                  variant="contained"
                  onClick={handleDisplayNameChange}>
                  <FontAwesomeIcon className="tw-w-3.5 tw-h-3.5" icon="check" />
                </Button>
              </div>
            </Space>
          ) : (
            <Fragment>
              <span className="tw-text-base tw-font-medium tw-mr-2 tw-overflow-auto">
                {userData.displayName || 'Add display name'}
              </span>
              <button
                className="tw-ml-2 focus:tw-outline-none"
                data-testid="edit-displayName"
                onClick={() => setIsDisplayNameEdit(true)}>
                <SVGIcons
                  alt="edit"
                  className="tw-mb-2"
                  icon="icon-edit"
                  title="Edit"
                  width="16px"
                />
              </button>
            </Fragment>
          )}
        </div>
      );
    } else {
      return (
        <p className="tw-mt-2">
          {getEntityName(userData as unknown as EntityReference)}
        </p>
      );
    }
  };

  const getDescriptionComponent = () => {
    if (isAdminUser || isLoggedinUser || isAuthDisabled) {
      return (
        <div className="tw--ml-5 tw-flex tw-items-center tw-justify-between">
          <Description
            description={userData.description || ''}
            entityName={getEntityName(userData as unknown as EntityReference)}
            hasEditAccess={isAdminUser || isLoggedinUser}
            isEdit={isDescriptionEdit}
            onCancel={() => setIsDescriptionEdit(false)}
            onDescriptionEdit={() => setIsDescriptionEdit(true)}
            onDescriptionUpdate={handleDescriptionChange}
          />
        </div>
      );
    } else {
      return (
        <div className="tw--ml-2 tw-px-3">
          <p className="tw-mt-2">
            {userData.description || (
              <span className="tw-no-description">No description </span>
            )}
          </p>
        </div>
      );
    }
  };

  const getChangePasswordComponent = () => {
    return (
      <div>
        <Typography.Text
          className="text-primary text-xs cursor-pointer"
          onClick={() => setIsChangePassword(true)}>
          Change Password
        </Typography.Text>

        <ChangePasswordForm
          isLoading={isLoading}
          isLoggedinUser={isLoggedinUser}
          visible={isChangePassword}
          onCancel={() => setIsChangePassword(false)}
          onSave={(data) => handleChangePassword(data)}
        />
      </div>
    );
  };

  const getTeamsComponent = () => {
    const teamsElement = (
      <Fragment>
        {getNonDeletedTeams(userData.teams ?? []).map((team, i) => (
          <div
            className="tw-mb-2 tw-flex tw-items-center tw-gap-2"
            data-testid={team.name}
            key={i}>
            <SVGIcons alt="icon" className="tw-w-4" icon={Icons.TEAMS_GREY} />
            <Typography.Text
              className="ant-typography-ellipsis-custom w-48"
              ellipsis={{ tooltip: true }}>
              {getEntityName(team)}
            </Typography.Text>
          </div>
        ))}
        {isEmpty(userData.teams) && (
          <span className="tw-no-description ">No teams found</span>
        )}
      </Fragment>
    );

    if (!isAdminUser && !isAuthDisabled) {
      return (
        <Card
          className="ant-card-feed tw-relative"
          key="teams-card"
          style={{
            ...leftPanelAntCardStyle,
            marginTop: '20px',
          }}
          title={
            <div className="tw-flex tw-items-center tw-justify-between">
              <h6 className="tw-heading tw-mb-0">Teams</h6>
            </div>
          }>
          <div className="tw-mb-4">{teamsElement}</div>
        </Card>
      );
    } else {
      return (
        <Card
          className="ant-card-feed tw-relative"
          key="teams-card"
          style={{
            ...leftPanelAntCardStyle,
            marginTop: '20px',
          }}
          title={
            <div className="tw-flex tw-items-center tw-justify-between">
              <h6 className="tw-heading tw-mb-0">Teams</h6>
              {!isTeamsEdit && (
                <button
                  className="tw-ml-2 focus:tw-outline-none tw-self-baseline"
                  data-testid="edit-teams"
                  onClick={() => setIsTeamsEdit(true)}>
                  <SVGIcons
                    alt="edit"
                    className=" tw-mb-1"
                    icon="icon-edit"
                    title="Edit"
                    width="16px"
                  />
                </button>
              )}
            </div>
          }>
          <div className="tw-mb-4">
            {isTeamsEdit ? (
              <Space className="tw-w-full" direction="vertical">
                <Select
                  isClearable
                  isMulti
                  isSearchable
                  aria-label="Select teams"
                  className="tw-w-full"
                  options={teams?.map((team) => ({
                    label: getEntityName(team as unknown as EntityReference),
                    value: team.id,
                  }))}
                  placeholder="Teams..."
                  styles={reactSingleSelectCustomStyle}
                  value={selectedTeams}
                  onChange={handleOnTeamsChange}
                />
                <div className="tw-flex tw-justify-end" data-testid="buttons">
                  <Button
                    className="tw-px-1 tw-py-1 tw-rounded tw-text-sm tw-mr-1"
                    data-testid="cancel-teams"
                    size="custom"
                    theme="primary"
                    variant="contained"
                    onMouseDown={() => setIsTeamsEdit(false)}>
                    <FontAwesomeIcon
                      className="tw-w-3.5 tw-h-3.5"
                      icon="times"
                    />
                  </Button>
                  <Button
                    className="tw-px-1 tw-py-1 tw-rounded tw-text-sm"
                    data-testid="save-teams"
                    size="custom"
                    theme="primary"
                    variant="contained"
                    onClick={handleTeamsChange}>
                    <FontAwesomeIcon
                      className="tw-w-3.5 tw-h-3.5"
                      icon="check"
                    />
                  </Button>
                </div>
              </Space>
            ) : (
              teamsElement
            )}
          </div>
        </Card>
      );
    }
  };

  const getRolesComponent = () => {
    const userRolesOption = roles?.map((role) => ({
      label: getEntityName(role as unknown as EntityReference),
      value: role.id,
    }));
    if (!userData.isAdmin) {
      userRolesOption.push({
        label: TERM_ADMIN,
        value: toLower(TERM_ADMIN),
      });
    }

    const rolesElement = (
      <Fragment>
        {userData.isAdmin && (
          <div className="tw-mb-2 tw-flex tw-items-center tw-gap-2">
            <SVGIcons alt="icon" className="tw-w-4" icon={Icons.USERS} />
            <span>{TERM_ADMIN}</span>
          </div>
        )}
        {userData.roles?.map((role, i) => (
          <div className="tw-mb-2 tw-flex tw-items-center tw-gap-2" key={i}>
            <SVGIcons alt="icon" className="tw-w-4" icon={Icons.USERS} />
            <Typography.Text
              className="ant-typography-ellipsis-custom w-48"
              ellipsis={{ tooltip: true }}>
              {getEntityName(role)}
            </Typography.Text>
          </div>
        ))}
        {!userData.isAdmin && isEmpty(userData.roles) && (
          <span className="tw-no-description ">
            {t('label.no-roles-assigned')}
          </span>
        )}
      </Fragment>
    );

    if (!isAdminUser && !isAuthDisabled) {
      return (
        <Card
          className="ant-card-feed tw-relative"
          key="roles-card"
          style={{
            ...leftPanelAntCardStyle,
            marginTop: '20px',
          }}
          title={
            <div className="tw-flex tw-items-center tw-justify-between">
              <h6 className="tw-heading tw-mb-0">{t('label.roles')}</h6>
            </div>
          }>
          <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
            {rolesElement}
          </div>
        </Card>
      );
    } else {
      return (
        <Card
          className="ant-card-feed tw-relative"
          key="roles-card"
          style={{
            ...leftPanelAntCardStyle,
            marginTop: '20px',
          }}
          title={
            <div className="tw-flex tw-items-center tw-justify-between">
              <h6 className="tw-heading tw-mb-0">{t('label.roles')}</h6>
              {!isRolesEdit && (
                <button
                  className="tw-ml-2 focus:tw-outline-none tw-self-baseline"
                  data-testid="edit-roles"
                  onClick={() => setIsRolesEdit(true)}>
                  <SVGIcons
                    alt="edit"
                    className="tw-mb-1"
                    icon="icon-edit"
                    title="Edit"
                    width="16px"
                  />
                </button>
              )}
            </div>
          }>
          <div className="tw-mb-4">
            {isRolesEdit ? (
              <Space className="tw-w-full" direction="vertical">
                <Select
                  isClearable
                  isMulti
                  isSearchable
                  aria-label="Select roles"
                  className="tw-w-full"
                  id="select-role"
                  options={userRolesOption}
                  placeholder="Roles..."
                  styles={reactSingleSelectCustomStyle}
                  value={selectedRoles}
                  onChange={handleOnRolesChange}
                />
                <div className="tw-flex tw-justify-end" data-testid="buttons">
                  <Button
                    className="tw-px-1 tw-py-1 tw-rounded tw-text-sm tw-mr-1"
                    data-testid="cancel-roles"
                    size="custom"
                    theme="primary"
                    variant="contained"
                    onMouseDown={() => setIsRolesEdit(false)}>
                    <FontAwesomeIcon
                      className="tw-w-3.5 tw-h-3.5"
                      icon="times"
                    />
                  </Button>
                  <Button
                    className="tw-px-1 tw-py-1 tw-rounded tw-text-sm"
                    data-testid="save-roles"
                    size="custom"
                    theme="primary"
                    variant="contained"
                    onClick={handleRolesChange}>
                    <FontAwesomeIcon
                      className="tw-w-3.5 tw-h-3.5"
                      icon="check"
                    />
                  </Button>
                </div>
              </Space>
            ) : (
              rolesElement
            )}
          </div>
        </Card>
      );
    }
  };

  const getInheritedRolesComponent = () => {
    return (
      <Card
        className="ant-card-feed tw-relative"
        key="inherited-roles-card-component"
        style={{
          ...leftPanelAntCardStyle,
          marginTop: '20px',
        }}
        title={
          <div className="tw-flex">
            <h6 className="tw-heading tw-mb-0" data-testid="inherited-roles">
              {t('label.inherited-roles')}
            </h6>
          </div>
        }>
        <Fragment>
          {isEmpty(userData.inheritedRoles) ? (
            <div className="tw-mb-4">
              <span className="tw-no-description">
                {t('label.no-inherited-found')}
              </span>
            </div>
          ) : (
            <div className="tw-flex tw-justify-between tw-flex-col">
              {userData.inheritedRoles?.map((inheritedRole, i) => (
                <div
                  className="tw-mb-2 tw-flex tw-items-center tw-gap-2"
                  key={i}>
                  <SVGIcons alt="icon" className="tw-w-4" icon={Icons.USERS} />

                  <Typography.Text
                    className="ant-typography-ellipsis-custom w-48"
                    ellipsis={{ tooltip: true }}>
                    {getEntityName(inheritedRole)}
                  </Typography.Text>
                </div>
              ))}
            </div>
          )}
        </Fragment>
      </Card>
    );
  };

  const image = useMemo(
    () =>
      getImageWithResolutionAndFallback(
        ImageQuality['6x'],
        userData.profile?.images
      ),
    [userData.profile?.images]
  );

  const fetchLeftPanel = () => {
    return (
      <div className="user-profile-antd-card" data-testid="left-panel">
        <Card
          className="ant-card-feed tw-relative"
          key="left-panel-card"
          style={{
            ...leftPanelAntCardStyle,
          }}>
          {isImgUrlValid ? (
            <Image
              alt="profile"
              className="tw-w-full"
              preview={false}
              referrerPolicy="no-referrer"
              src={image || ''}
              onError={() => {
                SetIsImgUrlValid(false);
              }}
            />
          ) : (
            <div style={{ width: 'inherit' }}>
              <ProfilePicture
                displayName={userData?.displayName || userData.name}
                height="150"
                id={userData?.id || ''}
                name={userData?.name || ''}
                textClass="tw-text-5xl"
                width=""
              />
            </div>
          )}
          <Space className="p-sm" direction="vertical" size={8}>
            {getDisplayNameComponent()}
            <p>{userData.email}</p>
            {getDescriptionComponent()}
            {isAuthProviderBasic &&
              (isAdminUser || isLoggedinUser) &&
              getChangePasswordComponent()}
          </Space>
        </Card>
        {getTeamsComponent()}
        {getRolesComponent()}
        {getInheritedRolesComponent()}
      </div>
    );
  };

  const getLoader = () => {
    return isFeedLoading ? <Loader /> : null;
  };

  const getFeedTabData = () => {
    return (
      <Fragment>
        <div className="tw--mt-4 tw-px-1.5 tw-flex tw-justify-between">
          <div className="tw-relative">
            <Button
              className="hover:tw-no-underline focus:tw-no-underline"
              data-testid="feeds"
              size="custom"
              tag="button"
              variant="link"
              onClick={() => setShowFilterList((visible) => !visible)}>
              <span className="tw-font-medium tw-text-grey">
                {(activeTab === 1 ? userPageFilterList : filterListTasks).find(
                  (f) => f.value === feedFilter
                )?.name || capitalize(feedFilter)}
              </span>
              <DropDownIcon />
            </Button>
            {showFilterList && (
              <DropDownList
                dropDownList={
                  activeTab === 1 ? userPageFilterList : filterListTasks
                }
                value={feedFilter}
                onSelect={handleFilterDropdownChange}
              />
            )}
          </div>
          {isTaskType ? (
            <Space align="end" size={5}>
              <Switch onChange={onSwitchChange} />
              <span className="tw-ml-1">{t('label.closed-tasks')}</span>
            </Space>
          ) : null}
        </div>
        <div className="tw-mt-3.5">
          <ActivityFeedList
            hideFeedFilter
            hideThreadFilter
            withSidePanel
            className=""
            deletePostHandler={deletePostHandler}
            feedList={feedData}
            postFeedHandler={postFeedHandler}
            updateThreadHandler={updateThreadHandler}
          />
        </div>
        <div
          data-testid="observer-element"
          id="observer-element"
          ref={elementRef as RefObject<HTMLDivElement>}>
          {getLoader()}
        </div>
      </Fragment>
    );
  };

  const prepareSelectedRoles = () => {
    const defaultRoles = [
      ...(userData.roles?.map((role) => ({
        label: getEntityName(role),
        value: role.id,
      })) || []),
    ];
    if (userData.isAdmin) {
      defaultRoles.push({
        label: TERM_ADMIN,
        value: toLower(TERM_ADMIN),
      });
    }
    setSelectedRoles(defaultRoles);
  };

  const prepareSelectedTeams = () => {
    setSelectedTeams(
      getNonDeletedTeams(userData.teams || []).map((team) => ({
        label: getEntityName(team),
        value: team.id,
      }))
    );
  };

  const fetchMoreFeed = (
    isElementInView: boolean,
    pagingObj: Paging,
    isLoading: boolean
  ) => {
    if (isElementInView && pagingObj?.after && !isLoading) {
      const threadType =
        activeTab === 2 ? ThreadType.Task : ThreadType.Conversation;
      fetchFeedHandler(threadType, pagingObj.after);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await getRoles(
        '',
        undefined,
        undefined,
        false,
        PAGE_SIZE_LARGE
      );
      setRoles(response.data);
    } catch (err) {
      setRoles([]);
      showErrorToast(
        err as AxiosError,
        jsonData['api-error-messages']['fetch-roles-error']
      );
    }
  };

  useEffect(() => {
    fetchMoreFeed(isInView as boolean, paging, isFeedLoading);
  }, [isInView, paging, isFeedLoading]);

  useEffect(() => {
    fetchTeams();
    fetchRoles();
  }, []);

  useEffect(() => {
    prepareSelectedRoles();
    prepareSelectedTeams();
  }, [userData]);

  useEffect(() => {
    if (image) {
      SetIsImgUrlValid(true);
    }
  }, [image]);

  const getEntityData = useCallback(
    (entityData: EntityReference[], tabNumber: number) => {
      const updatedEntityData = filterEntityAssets(entityData || []);

      return (
        <div
          className="tw-grid xxl:tw-grid-cols-4 md:tw-grid-cols-3 tw-gap-4"
          data-testid="dataset-card">
          {isEmpty(updatedEntityData) ? (
            tabNumber === 3 ? (
              <div className="tw-mx-2"> {t('label.not-owned-yet')}.</div>
            ) : (
              <div className="tw-mx-2"> {t('label.not-followed-yet')}.</div>
            )
          ) : null}
          {updatedEntityData.map((dataset, index) => {
            const Dataset = {
              displayName: dataset.displayName || dataset.name || '',
              type: dataset.type,
              fqn: dataset.fullyQualifiedName || '',
              id: dataset.id,
              name: dataset.name,
            };

            return (
              <UserCard isDataset isIconVisible item={Dataset} key={index} />
            );
          })}
        </div>
      );
    },
    []
  );

  return (
    <PageLayoutV1 className="tw-h-full" leftPanel={fetchLeftPanel()}>
      <div className="tw-mb-10">
        <TabsPane
          activeTab={activeTab}
          className="tw-flex-initial"
          setActiveTab={activeTabHandler}
          tabs={USER_PROFILE_TABS}
        />
      </div>
      <div>{(activeTab === 1 || activeTab === 2) && getFeedTabData()}</div>
      <div>{activeTab === 3 && getEntityData(userData.owns || [], 3)}</div>
      <div>{activeTab === 4 && getEntityData(userData.follows || [], 4)}</div>
    </PageLayoutV1>
  );
};

export default observer(Users);
