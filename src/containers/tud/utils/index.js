// @flow

import merge from 'lodash/merge';
import { get, getIn } from 'immutable';
import { DataProcessingUtils } from 'lattice-fabricate';
import { DateTime } from 'luxon';

import * as EatingIndoorRecSchema from '../schemas/followup/EatingIndoorRecSchema';
import * as MediaUseSchema from '../schemas/followup/MediaUseSchema';
import * as OutdoorRecSchema from '../schemas/followup/OutdoorRecSchema';
import * as OutdoorsSchema from '../schemas/followup/OutdoorsSchema';
import * as SleepingSchema from '../schemas/followup/SleepingSchema';
import { ACTIVITY_NAMES, PRIMARY_ACTIVITIES } from '../constants/ActivitiesConstants';
import { PAGE_NUMBERS } from '../constants/GeneralConstants';
import { PROPERTY_CONSTS } from '../constants/SchemaConstants';

const { DAY_SPAN_PAGE, FIRST_ACTIVITY_PAGE } = PAGE_NUMBERS;

const {
  EATING_DRINKING,
  MEDIA,
  RECREATION_INSIDE,
  RECREATION_OUTSIDE,
  SLEEPING,
  OUTDOORS,
} = ACTIVITY_NAMES;

const {
  ACTIVITY_END_TIME,
  ACTIVITY_NAME,
  ACTIVITY_START_TIME,
  DAY_END_TIME,
  DAY_START_TIME
} = PROPERTY_CONSTS;

const { getPageSectionKey } = DataProcessingUtils;

const selectTimeByPageAndKey = (pageNum :number, key :string, formData :Object) => {
  const psk = getPageSectionKey(pageNum, 0);
  const result = getIn(formData, [psk, key]);
  return DateTime.fromISO(result);
};

const selectPrimaryActivityByPage = (pageNum :number, formData :Object) => {
  const psk = getPageSectionKey(pageNum, 0);

  const activityName = getIn(formData, [psk, ACTIVITY_NAME]);
  return PRIMARY_ACTIVITIES.find((activity) => activity.name === activityName);
};

const createFormSchema = (pageNum :number, formData :Object) => {

  const prevActivity = selectPrimaryActivityByPage(pageNum - 1, formData);
  const prevEndTime = pageNum === FIRST_ACTIVITY_PAGE
    ? selectTimeByPageAndKey(1, DAY_START_TIME, formData)
    : selectTimeByPageAndKey(pageNum - 1, ACTIVITY_END_TIME, formData);
  const formattedTime = prevEndTime.toLocaleString(DateTime.TIME_SIMPLE);

  const currentActivity = selectPrimaryActivityByPage(pageNum, formData);

  // follow up schemas
  const sleepingSchema = SleepingSchema.createSchema(pageNum);
  const eatingIndoorRecSchema = EatingIndoorRecSchema.createSchema(pageNum);
  const mediaUseSchema = MediaUseSchema.createSchema(pageNum);
  const outdoorRecSchema = OutdoorRecSchema.createSchema(pageNum);
  const outdoorsSchema = OutdoorsSchema.createSchema(pageNum);

  return {
    type: 'object',
    title: '',
    properties: {
      [getPageSectionKey(pageNum, 0)]: {
        properties: {
          [ACTIVITY_NAME]: {
            type: 'string',
            title: (pageNum === FIRST_ACTIVITY_PAGE
              ? `What did your child start doing at ${formattedTime}?`
              : `What time did your child start doing at ${formattedTime} after they `
                + `finished ${(prevActivity || {}).description}?`),
            enum: PRIMARY_ACTIVITIES.map((activity) => activity.name)
          },
          [ACTIVITY_START_TIME]: {
            type: 'string',
            title: '',
            default: prevEndTime.toLocaleString(DateTime.TIME_24_SIMPLE)
          },
          [ACTIVITY_END_TIME]: {
            id: 'end_time',
            type: 'string',
            title: currentActivity
              ? `When did your child stop ${currentActivity.description}?`
              : 'When did the selected activity end?'
          }
        },
        dependencies: {
          [ACTIVITY_NAME]: {
            oneOf: [
              {
                properties: {
                  [ACTIVITY_NAME]: {
                    enum: [SLEEPING]
                  },
                  ...sleepingSchema,
                }
              },
              {
                properties: {
                  [ACTIVITY_NAME]: {
                    enum: [EATING_DRINKING, RECREATION_INSIDE]
                  },
                  ...eatingIndoorRecSchema
                }
              },
              {
                properties: {
                  [ACTIVITY_NAME]: {
                    enum: [RECREATION_OUTSIDE]
                  },
                  ...outdoorRecSchema
                }
              },
              {
                properties: {
                  [ACTIVITY_NAME]: {
                    enum: [MEDIA]
                  },
                  ...mediaUseSchema
                }
              },
              {
                properties: {
                  [ACTIVITY_NAME]: {
                    enum: [OUTDOORS]
                  },
                  ...outdoorsSchema
                }
              },
              {
                properties: {
                  [ACTIVITY_NAME]: {
                    enum: PRIMARY_ACTIVITIES.filter((activity) => !activity.followup).map((activity) => activity.name)
                  }
                }
              }
            ]
          }
        },
        title: '',
        type: 'object',
        required: [ACTIVITY_NAME, ACTIVITY_END_TIME]
      }
    },
  };
};

const createUiSchema = (pageNum :number) => {

  const followUpUiSchema = merge(
    SleepingSchema.createUiSchema(pageNum),
    EatingIndoorRecSchema.createUiSchema(pageNum),
    MediaUseSchema.createUiSchema(pageNum),
    OutdoorRecSchema.createUiSchema(pageNum),
    OutdoorsSchema.createUiSchema(pageNum)
  );

  return {
    [getPageSectionKey(pageNum, 0)]: {
      classNames: 'column-span-12 grid-container',
      [ACTIVITY_NAME]: {
        classNames: (pageNum === DAY_SPAN_PAGE ? 'hidden' : 'column-span-12')
      },
      [ACTIVITY_START_TIME]: {
        classNames: (pageNum === DAY_SPAN_PAGE ? 'column-span-12' : 'hidden'),
        'ui:widget': 'TimeWidget',
      },
      [ACTIVITY_END_TIME]: {
        classNames: 'column-span-12',
        'ui:widget': 'TimeWidget'
      },
      ...followUpUiSchema
    },
  };
};

const createTimeUseSummary = (formData :Object) => {

  const summary = [];

  // get day duration (start and end)
  const dayStartTime = selectTimeByPageAndKey(1, DAY_START_TIME, formData);
  const dayEndTime = selectTimeByPageAndKey(1, DAY_END_TIME, formData);

  // add day start time
  summary.push({
    time: dayStartTime.toLocaleString(DateTime.TIME_SIMPLE),
    description: 'Child woke up',
    pageNum: DAY_SPAN_PAGE
  });

  Object.keys(formData).forEach((key, index) => {
    if (index !== 0 && index !== 1) { // skip page 0 and 1
      const startTime = selectTimeByPageAndKey(index, ACTIVITY_START_TIME, formData);
      const endTime = selectTimeByPageAndKey(index, ACTIVITY_END_TIME, formData);
      const primaryActivity = selectPrimaryActivityByPage(index, formData);

      const entry = {
        time: `${startTime.toLocaleString(DateTime.TIME_SIMPLE)} - ${endTime.toLocaleString(DateTime.TIME_SIMPLE)}`,
        description: get(primaryActivity, 'name'),
        pageNum: index
      };

      summary.push(entry);
    }
  });

  // add end of day
  summary.push({
    time: dayEndTime.toLocaleString(DateTime.TIME_SIMPLE),
    description: 'Child went to bed',
    pageNum: DAY_SPAN_PAGE
  });

  return summary;
};

const applyCustomValidation = (formData :Object, errors :Object, pageNum :number) => {
  const psk = getPageSectionKey(pageNum, 0);

  // For each activity, end date should greater than start date
  const startTimeKey = pageNum === DAY_SPAN_PAGE ? DAY_START_TIME : ACTIVITY_START_TIME;
  const endTimeKey = pageNum === DAY_SPAN_PAGE ? DAY_END_TIME : ACTIVITY_END_TIME;

  const currentStartTime = selectTimeByPageAndKey(pageNum, startTimeKey, formData);
  const currentEndTime = selectTimeByPageAndKey(pageNum, endTimeKey, formData);
  const dayEndTime = selectTimeByPageAndKey(1, DAY_END_TIME, formData);

  const errorMsg = pageNum === DAY_SPAN_PAGE
    ? `Bed time should be after ${currentStartTime.toLocaleString(DateTime.TIME_SIMPLE)}`
    : `End time should be after ${currentStartTime.toLocaleString(DateTime.TIME_SIMPLE)}`;

  if (currentStartTime.isValid && currentEndTime.isValid) {
    // $FlowFixMe invalid-compare
    if (currentEndTime <= currentStartTime) {
      errors[psk][endTimeKey].addError(errorMsg);
    }
    // the last activity of the day should end at the time the child went to bed
    // $FlowFixMe invalid-compare
    if (currentEndTime > dayEndTime) {
      errors[psk][endTimeKey].addError(`The last activity of the
          day should end at ${dayEndTime.toLocaleString(DateTime.TIME_SIMPLE)}
          since you indicated the child went to bed then.`);
    }
  }

  return errors;
};

export {
  applyCustomValidation,
  createFormSchema,
  createTimeUseSummary,
  createUiSchema,
  selectPrimaryActivityByPage,
  selectTimeByPageAndKey
};