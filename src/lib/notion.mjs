import { writeFile } from "node:fs/promises";

function toRichText(text) {
  return [
    {
      type: "text",
      text: {
        content: text
      }
    }
  ];
}

export function pageTitleProperty(title) {
  return {
    title: toRichText(title)
  };
}

export function richTextProperty(text) {
  return {
    rich_text: toRichText(text)
  };
}

export function emailProperty(email) {
  return {
    email
  };
}

export function selectProperty(name) {
  return {
    select: {
      name
    }
  };
}

export function multiSelectProperty(names) {
  return {
    multi_select: names.map((name) => ({ name }))
  };
}

export function dateProperty(start) {
  return {
    date: {
      start
    }
  };
}

export function checkboxProperty(checked) {
  return {
    checkbox: checked
  };
}

export class NotionClient {
  constructor({ token, version = "2025-09-03", dryRun = false }) {
    this.token = token;
    this.version = version;
    this.dryRun = dryRun;
    this.counter = 0;
  }

  async request(path, { method = "GET", body } = {}) {
    if (this.dryRun) {
      return { dryRun: true, path, method, body };
    }

    const response = await fetch(`https://api.notion.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Notion-Version": this.version,
        "Content-Type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`${method} ${path} failed: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  async createPage({ parent, title, children = [], icon }) {
    if (this.dryRun) {
      this.counter += 1;
      return {
        id: `dry-page-${this.counter}`,
        url: `https://notion.so/dry-page-${this.counter}`,
        parent,
        title,
        children
      };
    }

    return this.request("/v1/pages", {
      method: "POST",
      body: {
        parent,
        properties: {
          title: pageTitleProperty(title)
        },
        ...(icon ? { icon: { type: "emoji", emoji: icon } } : {}),
        children
      }
    });
  }

  async updatePageTitle(pageId, title) {
    if (this.dryRun) {
      return {
        id: pageId,
        title
      };
    }

    return this.request(`/v1/pages/${pageId}`, {
      method: "PATCH",
      body: {
        archived: false,
        properties: {
          title: pageTitleProperty(title)
        }
      }
    });
  }

  async appendBlockChildren(blockId, children) {
    if (!children.length) {
      return null;
    }

    return this.request(`/v1/blocks/${blockId}/children`, {
      method: "PATCH",
      body: {
        children
      }
    });
  }

  async createDatabase({ parentPageId, title, description, properties, icon }) {
    if (this.dryRun) {
      this.counter += 1;
      return {
        id: `dry-db-${this.counter}`,
        url: `https://notion.so/dry-db-${this.counter}`,
        parentPageId,
        title,
        description,
        properties,
        icon
      };
    }

    return this.request("/v1/databases", {
      method: "POST",
      body: {
        parent: {
          type: "page_id",
          page_id: parentPageId
        },
        title: toRichText(title),
        description: toRichText(description),
        icon: icon ? { type: "emoji", emoji: icon } : undefined,
        initial_data_source: {
          properties
        }
      }
    });
  }

  async retrieveDatabase(databaseId) {
    return this.request(`/v1/databases/${databaseId}`);
  }

  async retrieveDataSource(dataSourceId) {
    return this.request(`/v1/data_sources/${dataSourceId}`);
  }

  async queryDatabase(databaseId, body = {}) {
    if (this.dryRun) {
      return {
        results: []
      };
    }

    return this.request(`/v1/data_sources/${databaseId}/query`, {
      method: "POST",
      body
    });
  }

  async updateDatabase(databaseId, properties) {
    return this.request(`/v1/databases/${databaseId}`, {
      method: "PATCH",
      body: {
        properties
      }
    });
  }

  async updateDataSource(dataSourceId, properties) {
    return this.request(`/v1/data_sources/${dataSourceId}`, {
      method: "PATCH",
      body: {
        properties
      }
    });
  }

  async createRow({ dataSourceId, properties, children = [] }) {
    if (this.dryRun) {
      this.counter += 1;
      return {
        id: `dry-row-${this.counter}`,
        url: `https://notion.so/dry-row-${this.counter}`,
        dataSourceId,
        properties,
        children
      };
    }

    return this.request("/v1/pages", {
      method: "POST",
      body: {
        parent: {
          type: "data_source_id",
          data_source_id: dataSourceId
        },
        properties,
        children
      }
    });
  }

  async persistInstallOutput(path, payload) {
    await writeFile(path, JSON.stringify(payload, null, 2));
  }
}

export function paragraph(text) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: toRichText(text)
    }
  };
}

export function heading(level, text) {
  return {
    object: "block",
    type: `heading_${level}`,
    [`heading_${level}`]: {
      rich_text: toRichText(text)
    }
  };
}

export function bulleted(text) {
  return {
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: toRichText(text)
    }
  };
}

export function callout(text, emoji = "💡") {
  return {
    object: "block",
    type: "callout",
    callout: {
      rich_text: toRichText(text),
      icon: {
        type: "emoji",
        emoji
      }
    }
  };
}
