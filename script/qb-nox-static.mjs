#!/usr/bin/env zx
// import 'zx/globals'
import data from '../data/data.mjs';
const { qb_list, qb_service, qb_419_conf, qb_438_conf } = data

// zx setting
$.verbose = false;

// 生成图形
await $`cfonts "SeedBox" --gradient "#b92b27","#1565C0" --transition-gradient`

// 配置命令行参数
const { username, password, port, webport } = require('minimist')(process.argv.slice(2), {
  string: ['username', 'password', 'port', 'webport'],
  default: { port: 28888, webport: 8080 }
})
if (!username || !password) {
  console.log(chalk.bold.red("请输入账号或密码!"))
  process.exit(1)
}

// 选择qb版本
let index
while (!index || isNaN(index) || index < 1 || index > qb_list.length) {
  await $`clear`
  qb_list.forEach((qb, i) => {
    console.log(chalk.cyanBright(`${i + 1}. ${qb}`));
  });
  index = await question(chalk.yellowBright('请根据序号选择qb版本: '))
}
const qb_version = qb_list[index - 1]
console.log(chalk.red(`即将安装 ${qb_version}...`));

// 拉取qb文件
await $`wget -O "/usr/bin/${qb_version}" "https://github.com/shutu777/seedbox/raw/main/qb-nox/${qb_version}"`
await $`chmod +x "/usr/bin/${qb_version}"`

// 写入service
console.log(chalk.bold.bgGreenBright("---------------------创建qb服务---------------------"));
fs.writeFile(`/etc/systemd/system/${qb_version}@.service`, qb_service(qb_version), err => {
  if (err) {
    console.log(chalk.bold.red(err))
    process.exit(1)
  }
})

// 建立目录
console.log(chalk.bold.bgGreenBright("---------------------创建qb目录---------------------"));
await $`mkdir -p /home/${username}/Downloads && chown ${username} /home/${username}/Downloads`
await $`mkdir -p /home/${username}/.config/qBittorrent && chown ${username} /home/${username}/.config/qBittorrent`

// 创建qb服务
console.log(chalk.bold.bgGreenBright("---------------------qb开机自启---------------------"));
await $`systemctl start ${qb_version}@${username}`
await $`systemctl enable ${qb_version}@${username}`
await $`systemctl stop ${qb_version}@${username}`

// 根据版本写入默认配置文件
console.log(chalk.bold.bgGreenBright("---------------------qb默认配置---------------------"));
if (qb_version.indexOf('419') != -1) {
  let md5password = await $`echo -n ${password} | md5sum | awk '{print $1}'`
  md5password = md5password.toString().replace(/\r|\n/ig, "")
  fs.writeFile(`/home/${username}/.config/qBittorrent/qBittorrent.conf`, qb_419_conf(username, md5password, port, webport), err => {
    if (err) {
      console.log(chalk.bold.red(err))
      process.exit(1)
    }
  })
} else {
  await $`cd /home/${username} && wget https://raw.githubusercontent.com/jerry048/Seedbox-Components/main/Torrent%20Clients/qBittorrent/qb_password_gen && chmod +x /home/${username}/qb_password_gen`
  let PBKDF2password = await $`/home/${username}/qb_password_gen ${password}`
  PBKDF2password = PBKDF2password.toString().replace(/\r|\n/ig, "")
  fs.writeFile(`/home/${username}/.config/qBittorrent/qBittorrent.conf`, qb_438_conf(username, PBKDF2password.toString(), port, webport), err => {
    if (err) {
      console.log(chalk.bold.red(err))
      process.exit(1)
    }
  })
  await $`rm /home/${username}/qb_password_gen`
}

// 配置环境变量
console.log(chalk.bold.bgGreenBright("---------------------qb环境变量---------------------"));
const content = `export QB_VERSION=${qb_version}
export USERNAME=${username}`
fs.appendFile('/etc/profile', content, err => {
  if (err) {
    console.log(chalk.bold.red(err))
    process.exit(1)
  }
})
await $`source /etc/profile`

// 启动qb
console.log(chalk.bold.bgGreenBright("---------------------qb安装成功---------------------"));
await $`systemctl start ${qb_version}@${username}`
