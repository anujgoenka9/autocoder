import { useState, useEffect } from 'react';
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function useUser() {
  const { data: user, error, mutate } = useSWR('/api/user', fetcher);
  
  return {
    user,
    isLoading: !error && !user,
    isError: error,
    mutate
  };
} 