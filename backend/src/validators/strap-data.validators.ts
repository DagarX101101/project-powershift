import { z } from 'zod';

const productivityRowSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
  updatedAt: z.string({ required_error: 'Last updated timestamp is required for optimistic locking' }),
  capacity: z.string().optional(),
  uom: z.string().optional(),
  avgLead: z.number().nonnegative('Average Lead Distance must be a positive number').optional(),
  fy27: z.number().nonnegative('FY27 value must be a positive number').optional(),
  fy28: z.number().nonnegative('FY28 value must be a positive number').optional(),
  fy29: z.number().nonnegative('FY29 value must be a positive number').optional(),
  fy30: z.number().nonnegative('FY30 value must be a positive number').optional(),
  fy31: z.number().nonnegative('FY31 value must be a positive number').optional(),
});

export const updateVehicleProductivitySchema = z.object({
  body: z.array(productivityRowSchema).min(1, 'At least one row required'),
});

const siteInputRowSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
  updatedAt: z.string({ required_error: 'Last updated timestamp is required for optimistic locking' }),
  particular: z.string().min(1, 'Particular name required'),
  fy27: z.number().nonnegative('FY27 must be a positive number').optional(),
  fy28: z.number().nonnegative('FY28 must be a positive number').optional(),
  fy29: z.number().nonnegative('FY29 must be a positive number').optional(),
  fy30: z.number().nonnegative('FY30 must be a positive number').optional(),
  fy31: z.number().nonnegative('FY31 must be a positive number').optional(),
}).refine((data) => {
  // Coal Production and OB Production allow decimal values, remaining require whole numbers
  const isDecimalAllowed = ['Coal Production', 'OB Production'].includes(data.particular);
  if (!isDecimalAllowed) {
    const isWhole = (val?: number) => val === undefined || Number.isInteger(val);
    return isWhole(data.fy27) && isWhole(data.fy28) && isWhole(data.fy29) && isWhole(data.fy30) && isWhole(data.fy31);
  }
  return true;
}, {
  message: 'CHP Requirement and Available Power must be whole numbers',
});

export const updateMinePlanningInputsSchema = z.object({
  body: z.array(siteInputRowSchema).min(1, 'At least one row required'),
});

const todRowSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
  updatedAt: z.string({ required_error: 'Last updated timestamp is required for optimistic locking' }),
  fromTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid fromTime format').optional(),
  toTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid toTime format').optional(),
  totalHours: z.number().min(0).max(24, 'Total Hours must be between 0 and 24').optional(),
  consumptionPercentage: z.number().min(0).max(100, 'Consumption percentage must be between 0 and 100').optional(),
  percentageDifferenceFactor: z.number().nonnegative('Difference factor must be positive').optional(),
});

export const updateElectricalTodSchema = z.object({
  body: z.array(todRowSchema).min(1, 'At least one row required'),
});
