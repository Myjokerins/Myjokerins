import { capitalize } from 'lodash';
import { ElementLoadingState } from '../components/EntityLineage/EntityLineage.interface';
import { EntityType } from '../enums/entity.enum';

export const FOREIGN_OBJECT_SIZE = 40;
export const ZOOM_VALUE = 1;
export const MIN_ZOOM_VALUE = 0.5;
export const MAX_ZOOM_VALUE = 2.5;

export const entityData = [
  {
    type: EntityType.TABLE,
    label: capitalize(EntityType.TABLE),
  },
  { type: EntityType.PIPELINE, label: capitalize(EntityType.PIPELINE) },
  { type: EntityType.DASHBOARD, label: capitalize(EntityType.DASHBOARD) },
  { type: EntityType.TOPIC, label: capitalize(EntityType.TOPIC) },
  { type: EntityType.MLMODEL, label: capitalize(EntityType.MLMODEL) },
];

export const POSITION_X = 150;
export const POSITION_Y = 60;

export const NODE_WIDTH = 400;
export const NODE_HEIGHT = 50;

export const ELEMENT_DELETE_STATE = {
  loading: false,
  status: 'initial' as ElementLoadingState,
};
