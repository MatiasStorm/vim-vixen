import { injectable, inject } from 'tsyringe';
import CompletionGroup from '../domains/CompletionGroup';
import CommandDocs from '../domains/CommandDocs';
import CompletionsRepository from '../repositories/CompletionsRepository';
import CachedSettingRepository from '../repositories/CachedSettingRepository';
import TabPresenter from '../presenters/TabPresenter';
import Properties from '../../shared/settings/Properties';
import OpenCompletionUseCase from "../completion/OpenCompletionUseCase";

type Tab = browser.tabs.Tab;

@injectable()
export default class CompletionsUseCase {
  constructor(
    @inject('TabPresenter') private tabPresenter: TabPresenter,
    private completionsRepository: CompletionsRepository,
    @inject("CachedSettingRepository") private cachedSettingRepository: CachedSettingRepository,
    private completionUseCase: OpenCompletionUseCase
  ) {
  }

  queryConsoleCommand(prefix: string): Promise<CompletionGroup[]> {
    const keys = Object.keys(CommandDocs);
    const items = keys
      .filter(name => name.startsWith(prefix))
      .map(name => ({
        caption: name,
        content: name,
        url: CommandDocs[name],
      }));

    if (items.length === 0) {
      return Promise.resolve([]);
    }
    return Promise.resolve([{ name: 'Console Command', items }]);
  }

  async queryOpen(name: string, keywords: string): Promise<CompletionGroup[]> {
    // TODO This logic contains view entities.  They should be defined on
    // content script

    const settings = await this.cachedSettingRepository.get();
    const groups: CompletionGroup[] = [];

    const complete = settings.properties.complete;
    for (const c of complete) {
      if (c === 's') {
        // eslint-disable-next-line no-await-in-loop
        const engines = await this.querySearchEngineItems(name, keywords);
        if (engines.length > 0) {
          groups.push({ name: 'Search Engines', items: engines });
        }
        // browser.history not supported on Android
      } else if (c === 'h' && typeof browser.history === 'object') {
        // eslint-disable-next-line no-await-in-loop
        const histories = await this.queryHistoryItems(name, keywords);
        if (histories.length > 0) {
          groups.push({ name: 'History', items: histories });
        }
        // browser.bookmarks not supported on Android
      } else if (c === 'b' && typeof browser.bookmarks === 'object') {
        // eslint-disable-next-line no-await-in-loop
        const bookmarks = await this.queryBookmarkItems(name, keywords);
        if (bookmarks.length > 0) {
          groups.push({ name: 'Bookmarks', items: bookmarks });
        }
      }
    }
    return groups;
  }

  // eslint-disable-next-line max-statements
  async queryBuffer(
    name: string,
    keywords: string,
  ): Promise<CompletionGroup[]> {
    const lastId = await this.tabPresenter.getLastSelectedId();
    const trimmed = keywords.trim();
    let tabs: Tab[] = [];
    if (trimmed.length > 0 && !isNaN(Number(trimmed))) {
      const all = await this.tabPresenter.getAll();
      const index = parseInt(trimmed, 10) - 1;
      if (index >= 0 && index < all.length) {
        tabs = [all[index]];
      }
    } else if (trimmed === '%') {
      const all = await this.tabPresenter.getAll();
      const tab = all.find(t => t.active) as Tab;
      tabs = [tab];
    } else if (trimmed === '#') {
      if (typeof lastId !== 'undefined' && lastId !== null) {
        const all = await this.tabPresenter.getAll();
        const tab = all.find(t => t.id === lastId) as Tab;
        tabs = [tab];
      }
    } else {
      tabs = await this.completionsRepository.queryTabs(keywords, false);
    }
    const flag = (tab: Tab) => {
      if (tab.active) {
        return '%';
      } else if (tab.id === lastId) {
        return '#';
      }
      return ' ';
    };
    const items = tabs.map(tab => ({
      caption: tab.index + 1 + ': ' + flag(tab) + ' ' + tab.title,
      content: name + ' ' + tab.title,
      url: tab.url,
      icon: tab.favIconUrl,
    }));
    if (items.length === 0) {
      return Promise.resolve([]);
    }
    return [{ name: 'Buffers', items }];
  }

  queryBdelete(name: string, keywords: string): Promise<CompletionGroup[]> {
    return this.queryTabs(name, true, keywords);
  }

  queryBdeleteForce(
    name: string, keywords: string,
  ): Promise<CompletionGroup[]> {
    return this.queryTabs(name, false, keywords);
  }

  querySet(name: string, keywords: string): Promise<CompletionGroup[]> {
    const items = Properties.defs().map((def) => {
      if (def.type === 'boolean') {
        return [
          {
            caption: def.name,
            content: name + ' ' + def.name,
            url: 'Enable ' + def.description,
          }, {
            caption: 'no' + def.name,
            content: name + ' no' + def.name,
            url: 'Disable ' + def.description
          }
        ];
      }
      return [
        {
          caption: def.name,
          content: name + ' ' + def.name,
          url: 'Set ' + def.description,
        }
      ];
    });
    let flatten = items.reduce((acc, val) => acc.concat(val), []);
    flatten = flatten.filter((item) => {
      return item.caption.startsWith(keywords);
    });
    if (flatten.length === 0) {
      return Promise.resolve([]);
    }
    return Promise.resolve(
      [{ name: 'Properties', items: flatten }],
    );
  }

  async queryTabs(
    name: string, excludePinned: boolean, args: string,
  ): Promise<CompletionGroup[]> {
    const tabs = await this.completionsRepository.queryTabs(args, excludePinned);
    const items = tabs.map(tab => ({
      caption: tab.title,
      content: name + ' ' + tab.title,
      url: tab.url,
      icon: tab.favIconUrl
    }));
    if (items.length === 0) {
      return Promise.resolve([]);
    }
    return [{ name: 'Buffers', items }];
  }

  async querySearchEngineItems(name: string, query: string) {
    const engines = await this.completionUseCase.requestSearchEngines(query);
    return engines.map(item => ({
      caption: item,
      content: name + ' ' + item,
    }));
  }

  async queryHistoryItems(name: string, query: string) {
    const items = await this.completionUseCase.requestHistory(query);
    return items.map(item => ({
      caption: item.title,
      content: name + ' ' + item.url,
      url: item.url
    }));
  }

  async queryBookmarkItems(name: string, query: string) {
    const items = await this.completionUseCase.requestHistory(query);
    return items.map(item => ({
      caption: item.title,
      content: name + ' ' + item.url,
      url: item.url
    }));
  }
}
