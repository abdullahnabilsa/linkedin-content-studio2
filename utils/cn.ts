import classNames from 'clsx';
import { merge } from 'tailwind-merge';

export const cn = (...inputs: any) => merge(classNames(...inputs));