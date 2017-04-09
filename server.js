var http = require("http"),
 url = require("url"),
 superagent = require("superagent"),
 cheerio = require("cheerio"),
 async = require("async"),
 eventproxy = require('eventproxy');

var ep = new eventproxy();

var catchFirstUrl = 'http://www.youth.cn/',
	deleteRepeat = {},	//去重哈希数组
	urlsArray = [],	//存放爬取网址
    
    urlsArrayNext = [],

	catchDate = [],	//存放爬取数据
	pageUrls = [],	//存放收集文章页面网站
	pageNum = 200,	//要爬取文章的页数
	startDate = new Date(),	//开始时间
	endDate = false;	//结束时间

var totalArtical = 0;

function init()
{
    pageUrls.push('http://henan.youth.cn/');
}


function start(res)
{
    var strBaseHn = "http://henan.youth.cn";
    var strBaseHn_slash = "http://henan.youth.cn/";
    var strBaseHntx = 'http://henan.youth.cn/hntx/';

    var i = 0;

	ep.after('ArticleHtml', 21,  function(articleUrls)
	{
 	    //控制并发数
 	    var curCount = 0;
 	    var reptileMove = function(url, callback)
 	        {
 		        //延迟毫秒数
 		        var delay = parseInt((Math.random() * 30000000) % 1000, 10);
		        curCount++;
		        console.log('现在的并发数是', curCount, '，正在抓取的是', url, '，耗时' + delay + '毫秒');  
	  	
	  	        superagent.get(url).end(function(err, sres)
	  	            {
		                if (err) 
		                {
		                    //console.log(err);
		                    return;
		                }		  	

		                var $ = cheerio.load(sres.text);
						var artDate = "";
						
		                $('li').each(function(index_l1, elem_l1)
		                	{
		                		var art_timestamp = $('font', elem_l1).text();
                                if ((art_timestamp != undefined) 
                                	&& (art_timestamp != null) && (art_timestamp != ""))
                                {
                                    var articalUrl = $('a', elem_l1).attr('href');
                                    var strMark = articalUrl.slice(0, 2);

                                    if (strMark == "..")
                                    {
                                    	articalUrl = articalUrl.replace("../", strBaseHn_slash);
                                    }
                                    else if (strMark == "./")
                                    {
                                    	articalUrl = articalUrl.replace("./", url);
                                    }
                                    else if (strMark == "ht")  // DO nothing
                                    {}
                                    else
                                    {
                                    	articalUrl = "";
                                    }
                                    //console.log("art timestamp: " + art_timestamp + " -- " + articalUrl);

                                    if (articalUrl != "")
                                    {
                                        superagent.get(articalUrl).end(function(err, res_artic)
                                    	    {
								                if ((err)  || (res_artic == null))
								                {
								                    //console.log(err);
								                    return;
								                }

                                                var $ = cheerio.load(res_artic.text);
                                                var title = $('title').text();
								                $('meta').each(function(index_l1, elem_l1)
								                	{
								                		if ($(elem_l1).attr('name') == "publishdate")
								                		{
								                			artDate = $(elem_l1).attr('content');
								                		}

								                		if (($(elem_l1).attr('name') == "author") 
								                			&& ($(elem_l1).attr('content').indexOf("张亚云") >= 0))
								                		{
								                			console.log(articalUrl + " --" +$(elem_l1).attr('content'));
								                			//res.write(articalUrl + " --" + $(elem_l1).attr('content') +'<br/>');
								                			res.write("<a href=" + "\"" + articalUrl + "\">"  + title + " : " + artDate + "</a>" +'<br/>');
								                		}
								                    });
                                     	    });
                                    }
                                }
		                    });
	  		        });

	  	            setTimeout(function() 
	  	                {
		                    curCount--;
		                    callback(null,url +'Call back content');
		                }, delay);		
 	        };

            async.mapLimit(articleUrls, 10 ,function (url, callback) 
                {
		            reptileMove(url, callback);
		        }, function (err,result) 
		               {
		               });
	    });  // end of ep.after
	
	pageUrls.forEach(function(pageUrl)
	{
		superagent.get(pageUrl).end(function(err, pres)
		    {
				console.log('fetch ' + pageUrl + ' successful');
	            if ((err) || (pres == null) )
	            {
	                console.log(err);
	                return;
	   		    }

	            var $ = cheerio.load(pres.text);

                $('div.youth_nav_bgc').each(function(index_l1, elem_l1)
                	{
		                $('a', elem_l1).each(function(index_l2, elem_l2)
		                    {
		                        
                                var next_urls = $(this).attr('href');
		                        if ( next_urls != undefined)
                                {
		                            console.log(index_l2 + ": " + $(this).text());
		                            console.log(index_l2 + ": " + next_urls);
                                	urlsArray.push(next_urls);
                                }
		                    });
                    });

                $('ul.nav_list').each(function(index_l1, elem_l1)
                	{
		                $('a', elem_l1).each(function(index_l2, elem_l2)
		                    {
		                        
                                var next_urls = $(this).attr('href');
		                        if ( next_urls != undefined)
                                {
		                            console.log(index_l2 + ": " + $(this).text());
		                            console.log(index_l2 + ": " + next_urls);
                                	urlsArray.push(next_urls);
                                }
		                    });
                    });

                console.log("=============================================");
                console.log("=============================================");

                for (i = 0 ; i < urlsArray.length; i++)
                {
                	if (urlsArray[i].indexOf('http') == -1)
                	{
                        urlsArrayNext.push(strBaseHn.concat(urlsArray[i]));
                	}
                	//console.log(urlsArray[i]);
                }

                //ep.emit('ArticleHtml', urlsArrayNext[0]);
                
                for (i = 0 ; i < urlsArrayNext.length; i++)
                {
                    console.log(urlsArrayNext[i]);
                    ep.emit('ArticleHtml', urlsArrayNext[i]);
                }
                //*/
		    });
	}) // end of pageUrls.forEach
}


function onRequest(req, res)
{
    res.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'});

    start(res);
}

var serverPort = process.env.PORT || 5000;

function start_server()
{
	init();
    http.createServer(onRequest).listen(serverPort);	
}

start_server();
