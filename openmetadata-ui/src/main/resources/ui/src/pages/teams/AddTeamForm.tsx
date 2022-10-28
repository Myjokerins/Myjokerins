import { Form, Input, Modal, Select } from 'antd';
import { AxiosError } from 'axios';
import { isUndefined, toLower } from 'lodash';
import { EditorContentRef } from 'Models';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getTeams } from '../../axiosAPIs/teamsAPI';
import RichTextEditor from '../../components/common/rich-text-editor/RichTextEditor';
import { Team, TeamType } from '../../generated/entity/teams/team';
import jsonData from '../../jsons/en';
import { isUrlFriendlyName } from '../../utils/CommonUtils';
import { showErrorToast } from '../../utils/ToastUtils';

type AddTeamFormType = {
  visible: boolean;
  onCancel: () => void;
  onSave: (data: Team) => void;
  isLoading: boolean;
};

const AddTeamForm: React.FC<AddTeamFormType> = ({
  visible,
  onCancel,
  onSave,
  isLoading,
}) => {
  const { t } = useTranslation();
  const [description, setDescription] = useState<string>('');
  const [allTeam, setAllTeam] = useState<Team[]>([]);
  const markdownRef = useRef<EditorContentRef>();

  const teamTypeOptions = useMemo(() => {
    return Object.values(TeamType)
      .filter((type) => type !== TeamType.Organization)
      .map((type) => ({
        label: type,
        value: type,
      }));
  }, []);

  const validationMessages = useMemo(
    () => ({
      required: '${label} is required',
      string: {
        range: '${label} must be between ${min} and ${max}.',
      },
      whitespace: '${label} is required',
    }),
    []
  );

  const handleSubmit = (data: Team) => {
    data = {
      ...data,
      description,
    };
    onSave(data);
  };

  const fetchAllTeams = async () => {
    try {
      const { data } = await getTeams();

      setAllTeam(data);
    } catch (error) {
      showErrorToast(
        error as AxiosError,
        jsonData['api-error-messages']['unexpected-server-response']
      );
    }
  };

  useEffect(() => {
    if (visible) {
      fetchAllTeams();
    }
  }, [visible]);

  return (
    <Modal
      centered
      closable={false}
      confirmLoading={isLoading}
      okButtonProps={{
        form: 'add-team-form',
        type: 'primary',
        htmlType: 'submit',
      }}
      title={t('label.add-team')}
      visible={visible}
      width={650}
      onCancel={onCancel}>
      <Form
        id="add-team-form"
        initialValues={{
          teamType: TeamType.Department,
        }}
        layout="vertical"
        name="add-team-nest-messages"
        validateMessages={validationMessages}
        onFinish={handleSubmit}>
        <Form.Item
          label={t('label.name')}
          name="name"
          rules={[
            {
              required: true,
              type: 'string',
              min: 1,
              max: 128,
              whitespace: true,
            },
            {
              validator: (_, value) => {
                if (!isUrlFriendlyName(value)) {
                  return Promise.reject(
                    t('label.special-character-not-allowed')
                  );
                }
                if (
                  !isUndefined(
                    allTeam.find(
                      (item) => toLower(item.name) === toLower(value)
                    )
                  )
                ) {
                  return Promise.reject(t('label.name-already-exist'));
                }

                return Promise.resolve();
              },
            },
          ]}>
          <Input data-testid="name" placeholder={t('label.enter-name')} />
        </Form.Item>
        <Form.Item
          label={t('label.display-name')}
          name="displayName"
          rules={[
            {
              required: true,
              type: 'string',
              whitespace: true,
              min: 1,
              max: 128,
            },
          ]}>
          <Input
            data-testid="display-name"
            placeholder={t('label.enter-display-name')}
          />
        </Form.Item>
        <Form.Item label={t('label.team-type')} name="teamType">
          <Select
            data-testid="team-selector"
            options={teamTypeOptions}
            placeholder={t('label.select-team')}
          />
        </Form.Item>
        <Form.Item
          label={t('label.description')}
          name="description"
          style={{
            marginBottom: 0,
          }}>
          <RichTextEditor
            data-testid="description"
            initialValue=""
            ref={markdownRef}
            onTextChange={(value) => setDescription(value)}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default AddTeamForm;
