import { Provider, Subgroup, ResourceType, Resource } from '../Provider'
import { cheerioHttp, queryPropToString, parseHumanDate } from '../Utils'

export default class dmhy implements Provider {
  public baseUrl = 'https://share.dmhy.org'
  public typeAndSubgroupUrl = () => `${this.baseUrl}/topics/advanced-search?team_id=0&sort_id=0&orderby=`
  public listUrl = (keyword: string, type: string, subgroup: string) => `${this.baseUrl}/topics/list/page/1?keyword=${keyword}&sort_id=${type}&team_id=${subgroup}&order=date-desc`

  private fullListUrlProp?: string

  private unknownSubgroupId: number = -1
  private unknownSubgroupName: string = '未知字幕组'

  async getSubgroup(): Promise<Subgroup[]> {
    const $ = await cheerioHttp(this.typeAndSubgroupUrl())

    return $('select#AdvSearchTeam option')
      .map((i, el) => ({ Id: $(el).val(), Name: $(el).text() }))
      .get()
  }

  async getTypes(): Promise<ResourceType[]> {
    const $ = await cheerioHttp(this.typeAndSubgroupUrl())

    return $('select#AdvSearchSort option')
      .map((i, el) => ({ Id: $(el).val(), Name: $(el).text() }))
      .get()
  }

  async getResources(): Promise<Resource[]> {
    const $ = await cheerioHttp(this.fullListUrl())

    return $('table#topic_list tbody tr')
      .map((i, tr) => {
        const td0 = $(tr).find('td')[0]
        const td1 = $(tr).find('td')[1]
        const td2 = $(tr).find('td')[2]
        const td3 = $(tr).find('td')[3]
        const td4 = $(tr).find('td')[4]

        const td1_a0 = $(td1).find('a')[0]
        const td2_a0 = $(td2).find('a')[0]
        const td2_a_len = $(td2).find('a').length
        const td2_a_last = $(td2).find('a').last()
        const td3_a0 = $(td3).find('a')[0]

        return {
          Title: $(td2_a_last).text().trim(),
          TypeId: parseInt($(td1_a0).attr('href')?.replace(/\D+/, '') as string),
          TypeName: $(td1_a0).text().trim(),
          SubgroupId: td2_a_len === 2
            ? parseInt($(td2_a0).attr('href')?.replace(/\D+/, '') as string)
            : this.unknownSubgroupId,
          SubgroupName: td2_a_len === 2
            ? $(td2_a0).text().trim()
            : this.unknownSubgroupName,
          Magnet: $(td3_a0).attr('href'),
          PageUrl: this.baseUrl + $(td2_a_last).attr('href'),
          FileSize: $(td4).text().trim(),
          PublishDate: parseHumanDate($(td0).find('span').text().trim()).format('YYYY-MM-DD HH:mm:ss')
        }
      })
      .get()
  }

  async getHasMore(): Promise<boolean> {
    const $ = await cheerioHttp(this.fullListUrl())

    return $(`div.nav_title > a:contains('下一頁')`).length > 0
  }

  withList(keyword: string, subgroup?: number | string, type?: number | string, r?: number | string): Provider {
    this.fullListUrlProp = this.listUrl(
      encodeURI(keyword), queryPropToString(type), queryPropToString(subgroup)
    )

    return this
  }

  private fullListUrl(): string {
    if (typeof this.fullListUrlProp === 'undefined') {
      throw new Error('Forgot to call the withList() method')
    }

    return this.fullListUrlProp
  }
}
