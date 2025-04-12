import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
  if (!params.id) {
    throw error(404, 'Game not found');
  }
  
  return {
    id: params.id
  };
}; 