/* eslint-disable import/no-extraneous-dependencies */
/* eslint-disable import/extensions */
import {
  screen,
  BrowserWindow as ElectronWindow,
} from 'electron';
import { BrowserWindow } from './browser_window';
import { l10n } from '../l10n';
import { windowSizes } from '../constants';
import logger from '../logger';
import { DialogsStorage } from './dialogs_storage';
import { RequestSignature } from '../../@types/connection';

export interface ISignatureWindowParams {
  request: RequestSignature;
  onSign: (pin:string)=>Promise<void>;
  onReject?: ()=>Promise<void>;
  onCancel: ()=>Promise<void>;
  onError: (error: Error)=>Promise<void>;
}

interface IRejectWindowParams {
  id: string;
  showAgain?: boolean;
  showAgainValue?: boolean;
  text: string;
  result: number;
  buttonRejectLabel?: string;
  buttonApproveLabel?: string;
}
interface IKeyPinWindowParams {
  accept: boolean;
  pin: string;
  origin: string;
}

interface IErrorWindowParams {
  text: string;
}

interface IQuestionWindowParams {
  id: string;
  showAgain?: boolean;
  showAgainValue?: boolean;
  text: string;
  result: number;
  buttonRejectLabel?: string;
  buttonApproveLabel?: string;
}

interface IWarningWindowParams {
  title?: string;
  id: string;
  showAgain?: boolean;
  showAgainValue?: boolean;
  text: string;
  buttonRejectLabel: string;
}

class WindowsController {
  windows: Assoc<BrowserWindow> = {};

  static getScreenSize() {
    return screen.getPrimaryDisplay().bounds;
  }

  // eslint-disable-next-line class-methods-use-this
  showSignatureWindow(params: ISignatureWindowParams): Promise<void> {
    return new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const browserWindow = new BrowserWindow({
        params: {
          ...params,
        },
        size: 'default',
        app: 'p11-pin',
        windowOptions: {
          alwaysOnTop: true,
        },
        title: l10n.get('p11-pin'),
        onClosed: () => {
          resolve();
        },
      });
    });
  }

  showPreferencesWindow(defaultTab?: ('about' | 'updates' | 'settings')) {
    return new Promise<void>((resolve) => {
      const params = {
        defaultTab,
      };

      /**
       * Don't create if the window exists.
       */
      if (this.windows.preferences) {
        this.windows.preferences.focus();
        this.windows.preferences.show();

        this.windows.preferences.setParams(params);

        if (this.windows.question) {
          this.windows.question.close();
        }

        resolve();

        return;
      }

      this.windows.preferences = new BrowserWindow({
        size: 'default',
        app: 'preferences',
        title: '',
        params,
        onClosed: () => {
          delete this.windows.preferences;

          resolve();
        },
      });
    });
  }

  // eslint-disable-next-line class-methods-use-this
  showKeyPinWindow(params: IKeyPinWindowParams): Promise<IKeyPinWindowParams> {
    return new Promise((resolve) => {
      const { width, height } = WindowsController.getScreenSize();

      const browserWindow = new BrowserWindow({
        params: {
          titleKey: 'key-pin',
          ...params,
        },
        size: 'default',
        app: 'key-pin',
        title: l10n.get('key-pin'),
        windowOptions: {
          modal: true,
          alwaysOnTop: true,
          x: width - windowSizes.default.width,
          y: height - windowSizes.default.height,
        },
        onClosed: () => {
          resolve(browserWindow.getParams() as IKeyPinWindowParams);
        },
      });
    });
  }

  // eslint-disable-next-line class-methods-use-this
  showTokenWindow(): Promise<number> {
    return new Promise((resolve, reject) => {
      const params = {
        type: 'token',
        text: l10n.get('question.new.token'),
        id: 'question.new.token',
        showAgain: true,
        showAgainValue: false,
        result: 0,
      };

      if (
        params.id
        && params.showAgain
        && DialogsStorage.hasDialog(params.id)
      ) {
        logger.info('windows', 'Don\'t show dialog It\'s disabled', {
          id: params.id,
        });

        reject(new Error(`'${params.id}' window disabled`));

        return;
      }

      const browserWindow = new BrowserWindow({
        params: {
          titleKey: 'question',
          ...params,
        },
        app: 'message',
        size: 'small',
        windowOptions: {
          alwaysOnTop: true,
        },
        title: l10n.get('question'),
        onClosed: () => {
          DialogsStorage.onDialogClose(browserWindow.window);

          resolve(params.result);
        },
      });
    });
  }

  showErrorWindow(params: IErrorWindowParams) {
    return new Promise<void>((resolve) => {
      /**
       * Don't create if the window exists.
       */
      if (this.windows.error) {
        this.windows.error.focus();
        this.windows.error.show();

        resolve();

        return;
      }

      this.windows.error = new BrowserWindow({
        params: {
          type: 'error',
          titleKey: 'error',
          ...params,
        },
        app: 'message',
        size: 'small',
        title: l10n.get('error'),
        windowOptions: {
          alwaysOnTop: true,
        },
        onClosed: () => {
          delete this.windows.error;

          resolve();
        },
      });
    });
  }

  // eslint-disable-next-line class-methods-use-this
  showQuestionWindow(
    params: IQuestionWindowParams,
    parent?: ElectronWindow,
  ): Promise<IQuestionWindowParams> {
    return new Promise((resolve, reject) => {
      if (
        params.id
        && params.showAgain
        && DialogsStorage.hasDialog(params.id)
      ) {
        logger.info('windows', 'Don\'t show dialog It\'s disabled', {
          id: params.id,
        });

        reject(new Error(`'${params.id}' window disabled`));

        return;
      }

      const browserWindow = new BrowserWindow({
        params: {
          type: 'question',
          titleKey: 'question',
          ...params,
        },
        app: 'message',
        size: 'small',
        windowOptions: {
          alwaysOnTop: true,
          parent,
          modal: !!parent,
        },
        title: l10n.get('question'),
        onClosed: () => {
          DialogsStorage.onDialogClose(browserWindow.window);

          delete this.windows.question;

          resolve(browserWindow.getParams() as IQuestionWindowParams);
        },
      });

      this.windows.question = browserWindow;
    });
  }

  // eslint-disable-next-line class-methods-use-this
  showRejectWindow(
    params: IQuestionWindowParams,
    parent?: ElectronWindow,
  ): Promise<IQuestionWindowParams> {
    return new Promise((resolve, reject) => {
      if (
        params.id
          && params.showAgain
          && DialogsStorage.hasDialog(params.id)
      ) {
        logger.info('windows', 'Don\'t show dialog It\'s disabled', {
          id: params.id,
        });

        reject(new Error(`'${params.id}' window disabled`));

        return;
      }

      const browserWindow = new BrowserWindow({
        params: {
          type: 'question',
          titleKey: 'question',
          ...params,
        },
        app: 'message',
        size: 'small',
        windowOptions: {
          alwaysOnTop: true,
          parent,
          modal: !!parent,
        },
        title: l10n.get('question'),
        onClosed: () => {
          DialogsStorage.onDialogClose(browserWindow.window);

          delete this.windows.question;

          resolve(browserWindow.getParams() as IQuestionWindowParams);
        },
      });

      this.windows.question = browserWindow;
    });
  }

  showWarningWindow(params: IWarningWindowParams) {
    return new Promise<void>((resolve, reject) => {
      if (
        params.id
        && params.showAgain
        && DialogsStorage.hasDialog(params.id)
      ) {
        logger.info('windows', 'Don\'t show dialog It\'s disabled', {
          id: params.id,
        });

        reject(new Error(`'${params.id}' window disabled`));

        return;
      }

      /**
       * Don't create if the window exists.
       */
      if (this.windows.warning) {
        this.windows.warning.focus();
        this.windows.warning.show();

        resolve();

        return;
      }

      this.windows.warning = new BrowserWindow({
        params: {
          type: 'warning',
          titleKey: params.title || 'warning',
          ...params,
        },
        app: 'message',
        size: 'small',
        windowOptions: {
          alwaysOnTop: true,
        },
        title: params.title || l10n.get('warning'),
        onClosed: () => {
          DialogsStorage.onDialogClose(this.windows.warning.window);

          delete this.windows.warning;

          resolve();
        },
      });
    });
  }
}

export const windowsController = new WindowsController();
