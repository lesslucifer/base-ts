import moment = require("moment");

export class HC {
    static readonly APP_NAME = 'app_name';
    static readonly SUCCESS = {};
    static readonly DATETIME_FMT = 'YY-MM-DD HH:mm:ss'
    static readonly SHORT_DATE_FMT = 'YYMMDD';
    static readonly DEFAULT_BIRTHDAY = moment('2010-01-01');
    static readonly MAX_LIMIT = 1000;
    static readonly START_YEAR = 2015;
    static readonly DAY_SECS = 24 * 60 * 60;
};

export default HC;