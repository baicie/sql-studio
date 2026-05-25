import { storageService } from './storage-service';

export const workbenchStorage = {
  getItem(name: string) {
    return storageService.getItem(name);
  },
  setItem(name: string, value: string) {
    storageService.setItem(name, value);
  },
  removeItem(name: string) {
    storageService.removeItem(name);
  },
};
