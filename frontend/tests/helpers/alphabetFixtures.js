import { readFileSync,readdirSync } from 'node:fs';
import vm from 'node:vm';

export function alphabetFixtures() {
  const folder=new URL('../../books/',import.meta.url), context={window:{}};
  vm.createContext(context);
  const files=['activities.js',...readdirSync(folder).filter(file=>/^activities-.+\.js$/.test(file))];
  for(const file of files) vm.runInContext(readFileSync(new URL(file,folder),'utf8'),context);
  const marks=[];
  for(const [book,pages] of Object.entries(context.window.BOOK_ACTIVITIES)) {
    for(const [page,activities] of Object.entries(pages)) for(const activity of [].concat(activities)) {
      for(const step of activity.steps||[]) for(const mark of step.marks||[]) {
        if(/^[a-zA-Z]$/.test(mark.glyph)&&(mark.dots||mark.ink)) marks.push({book,page,...JSON.parse(JSON.stringify(mark))});
      }
    }
  }
  return marks;
}
