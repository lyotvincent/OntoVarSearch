
Render();

var Search_rownum = 1;
var tableIndex = 1;
var IconPlus = "fa fa-plus-square-o";
var IconMinus = "fa fa-minus-square-o";
var IsResultsFound = false;


function onKeyPress(e) {
    var keyCode = null;
    if (e.which)
        keyCode = e.which;
    else if (e.keyCode)
        keyCode = e.keyCode;

    if (keyCode == 13) {
        DoMainSearch();
        return true;
    }
    return true;
}


function Render() {
    layui.use('form', function () {
        var layer = layui.layer, form = layui.form;
        form.render();
        form.on('checkbox(filter)', function (data) {
            console.log(data.elem); //得到checkbox原始DOM对象
            console.log(data.elem.checked); //是否被选中，true或者false
            console.log(data.value); //复选框value值，也可以通过data.elem.value得到
            console.log(data.othis); //得到美化后的DOM对象
        });

    });
    layui.use(['layer','element'], function () {
        var element = layui.element;

    });
    Search_bind_autocomplete($("input[name='key']"),true);
}

function IsEmpty(str){
    return (str == "" || str == null || str == undefined)
}

$(document).ready(function() {
    $(".divInContainer").css({"background-color":'transparent'});
    $('.tabsholder3').cardTabs({theme: 'graygreen'});
    var GetVCFFilelist = function() {
      $.post('/download/showfiellist').done(function (data) {
            $("#Search_sel_DATABASE option").remove();
            for (let i of data){
                //default database clinvar
                if (i['collectionName'] == 'clinvar_20190520'){
                    $("#Search_sel_DATABASE").prepend("<option value='clinvar_20190520'>clinvar_20190520</option>");
                    $("#Search_sel_DATABASE").find("option[value='clinvar_20190520']").attr("selected",true);
                }else {
                    $("#Search_sel_DATABASE").append("<option value=" + i['collectionName'] + ">" + i['collectionName'] + "</option>");
                }
            }
            Render();
        })
    };
    GetVCFFilelist();





});


//input加入autocomplete 绑定key
function BindAutoconplete(element) {
    $.post("/search/getkeyfield").done(function (data) {
        element.autocomplete({
            minLength: 0,
            source: data,
            disabled:false,
            focus: function (event, ui) {
                element.val(ui.item.label);
                return false;
            },
            // focus :function () {
            //     return false;
            // },
            select: function(event, ui){
                $this = $(this);
                setTimeout(function () {
                    $this.blur();
                }, 1);
            }
        }).focus(function(){
                $(this).autocomplete("search");
                return false;
            }
        )
        .data("ui-autocomplete")._renderItem = function (ul, item) {
            if (item.desc){
                return $("<li>")
                .append("<a>" + item.value + "<br>" + item.desc + "</a>")
                .appendTo(ul);
            }else{
                return $("<li>")
                .append("<a>" + item.value +"</a>")
                .appendTo(ul);
            }

        }
    })
}

function  DoMainSearchManual(input) {
    $('#search_disease_input').val(input);
    DoMainSearch();
}

function DoMainSearch() {
    //输入合法判断
    var input = $('#search_disease_input').val();
    patt=/\w[\w|\d|\:|\-|\s]*\w$/
    if (!patt.test(input)){
         layui.use('layer', function () {
                var layer = layui.layer;
                layer.msg('invalid input: ' + input);
            });
         return;
    }

    //去掉空格
    input = input.replace(/^\s*|\s*$/g,"");
    $.busyLoadFull("show", { spinner: "accordion"});
    //clear old tables
    ClearOldData();
    IsResultsFound = false;
    if (input == "polyneuropathy"){
        $.when(DoDiseaseSearch(input)).then(Done);
    }
    else if (input == "ESRRB"){ //MYPN
        $.when(DoGeneInfoSearch(input)).then(Done);
    }
    else if (input == "SO:0000825"){
        $.when(DoOntologySearch(input)).then(Done);
    }
    else{
        $.when(DoGeneInfoSearch(input), DoDiseaseSearch(input), DoOntologySearch(input),DoRegionSearch(input),DoVariantIDSearch(input)).then(Done);
    }
    function Done() {
        $.busyLoadFull("hide");
        if (IsResultsFound == false) {
            layui.use('layer', function () {
                var layer = layui.layer;
                layer.msg('no results have been found for: ' + $('#search_disease_input').val());
            });
            $(".divInContainer").css({"background-color": 'transparent'});
            return;
        }
    }
}

function DoGeneInfoSearch(inputgene) {
    //var inputgene = $('#search_disease_input').val();
    if(IsEmpty(inputgene))   return;
    var deferred = $.Deferred();
    var Gene = {"json_data": inputgene};
    $.post('/search/doGeneInfoSearch/', Gene, null, 'json')
        .done(function (data) {
            if (data.length === 0){
            }else{
                $("#GeneInfoTable").parent('div').css({"background-color":'white'});
                IsResultsFound = true;
                CreatGeneInfoTable2('#GeneInfoTable', data);
            }

            return deferred.resolve();
        })
        .fail(function () {
            return deferred.reject();
        });
    return deferred.promise();
}

function DoSOInfoSearch(so) {
    //var inputgene = $('#search_disease_input').val();
    if(IsEmpty(so))   return;
    var deferred = $.Deferred();
    var SoInfo = {"json_data": so};
    $.post('/search/doSOInfoSearch/', SoInfo, null, 'json')
        .done(function (data) {
            if (data === null || data.length === 0){
            }else{
                $("#SOTable").parent('div').css({"background-color":'white'});
                IsResultsFound = true;
                var editor = new JsonEditor('#SOTable', data, {'defaultCollapsed':false,'editable':false})
                editor.load(data);
                try {
                    editor.get();
                } catch (ex) {
                    // Trigger an Error when JSON invalid
                    alert(ex);
                }
                //CreatGeneInfoTable2('#GeneInfoTable', data);
            }

            return deferred.resolve();
        })
        .fail(function () {
            return deferred.reject();
        });
    return deferred.promise();
}


function DoGeneDiseaseSearch(GeneName) {
    $.busyLoadFull("show", { spinner: "accordion"});
    //var inputgene = $('#search_disease_input').val();
    var inputgene = GeneName;
    var database = $('#Search_sel_DATABASE option:selected').val();
    if(IsEmpty(inputgene) || IsEmpty(database))   return;
    var deferred = $.Deferred();
    var Gene = {"json_data": inputgene, "database":database};
    $.post('/search/doGeneDiseaseSearch/', Gene, null, 'json')
        .done(function (data) {
            if (data.length === 0) {
                layui.use('layer', function () {
                    var layer = layui.layer;
                    layer.msg('no related diseases have been found for: ' + $('#search_disease_input').val());
                });
                $.busyLoadFull("hide");
                return deferred.resolve();
            }
            $("#GeneDiseaseTable").parents('.divInContainer').css({"background-color": 'white'});
            CreatGeneDiseaseTable('#GeneDiseaseTable', data, true);
            $.busyLoadFull("hide");
            return deferred.resolve();
        })
        .fail(function () {
            $.busyLoadFull("hide");
            return deferred.reject();
        });
    return deferred.promise();
}

function DoDiseaseSearch(DiseaseName) {
    //var inputdisease = $('#search_disease_input').val();
    var database = $('#Search_sel_DATABASE option:selected').val();
    if(IsEmpty(DiseaseName) || IsEmpty(database))   return;
    var deferred = $.Deferred();
    var disease = {"json_data": DiseaseName, "database":database};
    //$.busyLoadFull("show", { spinner: "accordion"});
    $.post('/search/doDiseaseSearch', disease, null, 'json')
        .done(function (data) {
            if (data.length === 0) {
            } else {
                $("#DiseaseDataTable").parents('.divInContainer').css({"background-color": 'white'});
                IsResultsFound = true;
                CreatDiseaseTable('#DiseaseDataTable', data, true);
            }
            //CreatDiseaseTable('#DiseaseDataTable', data, true);
            return deferred.resolve();
        })
        .fail(function () {
            return deferred.reject();
        });
    return deferred.promise();
}

function DoVariantIDSearch(VariantID) {
    var database = $('#Search_sel_DATABASE option:selected').val();
    if(IsEmpty(VariantID) || IsEmpty(database))   return;
    var deferred = $.Deferred();
    var disease = {"json_data": VariantID, "database":database};
    //$.busyLoadFull("show", { spinner: "accordion"});

    $.post('/search/DoVariantIDSearch/', disease, null, 'json')
        .done(function (data) {
            if (data.length === 0) {
            } else {
                $("#DataTable").parents('.divInContainer').css({"background-color": 'white'});
                IsResultsFound = true;
                CreatVCFTable('#DataTable', data, true);
            }
            return deferred.resolve();
        })
        .fail(function () {
            return deferred.reject();
        });
    return deferred.promise();
}

function DoRegionSearch(region) {
    var pattern = /(\d+|x|X|y|Y|chr\d+)(\:|\-)\d+\-\d+/;
    if (!pattern.test(region))    return;
    var database = $('#Search_sel_DATABASE option:selected').val();
    if(IsEmpty(region) || IsEmpty(database))   return;
    var deferred = $.Deferred();
    var datapatt = /\w+/g;
    var datalist = region.match(datapatt)
    if (datalist.length != 3) return;
    var jsondata = {"chr": datalist[0], "start":datalist[1], "end":datalist[2],"database":database};
    $.post('/search/DoRegionSearch/', jsondata, null, 'json')
        .done(function (data) {
            if (data.length === 0) {
            } else {
                $("#DataTable").parents('.divInContainer').css({"background-color": 'white'});
                IsResultsFound = true;
                CreatVCFTable('#DataTable', data, true);
            }
            return deferred.resolve();
        })
        .fail(function () {
            return deferred.reject();
        });
    return deferred.promise();
}

function DoOntologySearch(Ontology) {
    var database = $('#Search_sel_DATABASE option:selected').val();
    if(IsEmpty(Ontology) || IsEmpty(database))   return;
    var deferred = $.Deferred();
    var ontology = {"json_data": CorrectTerm(Ontology), "database":database};
    //$.busyLoadFull("show", { spinner: "accordion"});

    $.post('/search/DoOntologySearch/', ontology, null, 'json')
        .done(function (data) {
            if (data.length === 0) {
            } else {
                $("#DataTable").parents('.divInContainer').css({"background-color": 'white'});
                IsResultsFound = true;
                CreatVCFTable('#DataTable', data, true);
            }
            return deferred.resolve();
        })
        .fail(function () {
            return deferred.reject();
        });
    return deferred.promise();
    function CorrectTerm(term) {
        tPos = term.indexOf(':');
        if (tPos != -1){
            type = term.slice(0,tPos)
            ID = term.slice(tPos+1)
            if (type.toUpperCase().indexOf('S') != -1){
                type='SO'
            }else if (type.toUpperCase().indexOf('H') != -1){
                type='HP'
            }else if (type.toUpperCase().indexOf('G') != -1){
                type='GO'
            }else if (type.toUpperCase().indexOf('D') != -1){
                type='DOID'
            }
            return type+':'+ID;
        }
        else
            return term
    }
}

function DoGFF3Search(input) {
    $.busyLoadFull("show", { spinner: "accordion"});
    //var database = $('#Search_sel_DATABASE option:selected').val();
    if(IsEmpty(input))   return;
    var deferred = $.Deferred();
    //$.busyLoadFull("show", { spinner: "accordion"});
    var key = {"key": input};
    $.post('/search/doGFF3Search/', key, null, 'json')
        .done(function (data) {
            if (data.length === 0) {
                layui.use('layer', function () {
                    var layer = layui.layer;
                    layer.msg('no related results have been found for: ' + $('#search_disease_input').val());
                });
                $.busyLoadFull("hide");
                return deferred.resolve();
            }
            CreatGFF3Table('#GFF3Table', data, true);
            //CreatGFF3Table('#GFF3Table', data, true);
            $("#GFF3Table").parents('.divInContainer').css({"background-color":'white'});
            $.busyLoadFull("hide");
            return deferred.resolve();
        })
        .fail(function () {
            $.busyLoadFull("hide");
            return deferred.reject();
        });

    return deferred.promise();
}


function DoVCFSearch(GeneName) {
    $.busyLoadFull("show", { spinner: "accordion"});
    var database = $('#Search_sel_DATABASE option:selected').val();
    if(IsEmpty(GeneName) || IsEmpty(database))   return;
    var deferred = $.Deferred();
    //$.busyLoadFull("show", { spinner: "accordion"});
    var geneName = {"GeneName": GeneName, "database":database};
    $.post('/search/doVCFSearch/', geneName, null, 'json')
        .done(function (data) {
            if (data.length === 0) {
                layui.use('layer', function () {
                    var layer = layui.layer;
                    layer.msg('no related variants have been found for: ' + $('#search_disease_input').val());
                });
                $.busyLoadFull("hide");
                return deferred.resolve();
            }
            CreatVCFTable('#DataTable', data, true);
            $("#DataTable").parents('.divInContainer').css({"background-color":'white'});
            $.busyLoadFull("hide");
            return deferred.resolve();
        })
        .fail(function () {
            $.busyLoadFull("hide");
            return deferred.reject();
        });

    return deferred.promise();
}

//gene:PEX10
function DoVCFSearchwithOntology(chr, start, end, ontology){
    $.busyLoadFull("show", { spinner: "accordion"});
    var database = $('#Search_sel_DATABASE option:selected').val();
    if(IsEmpty(chr) || IsEmpty(start) || IsEmpty(end) || IsEmpty(ontology) || IsEmpty(database))   return;
    var deferred = $.Deferred();
    var jsondata = {"chr": chr, "start":start, "end":end, "ontology":"ALL","database":database};
    $.post('/search/doVCFSearchWithOntology/', jsondata, null, 'json')
        .done(function (data) {
            if (data.length === 0) {
                layui.use('layer', function () {
                    var layer = layui.layer;
                    layer.msg('no related variants have been found for: ' + $('#search_disease_input').val());
                });
                $.busyLoadFull("hide");
                return deferred.resolve();
            }
            CreatVCFTableWithOntology('#DataTableontology', data, true, ontology);
            $("#DataTableontology").parents('.divInContainer').css({"background-color":'white'});
            $.busyLoadFull("hide");
            return deferred.resolve();
        })
        .fail(function () {
            $.busyLoadFull("hide");
            return deferred.reject();
        });

    return deferred.promise();
}


//二级table的模板
function format2(table_id) {
    return '<table id="DataTable'+ table_id +'" class="table table-striped table-bordered table-hover" cellpadding="5" cellspacing="0" border="0"></table>';
}



//gene information
function CreatGeneInfoColums(data) {
    var sort_up = function (x,y) {
        return x.targets - y.targets;
    };
    var GetColumnPos = function(ColumnName){
        switch (ColumnName) {
            case "GeneName":
                return 0;
            case "GeneID":
                return 1;
            case "Chr":
                return 2;
            case "Start":
                return 3;
            case "End":
                return 4;
            case "Strand":
                return 5;
            case "External":
                return 7;
            case "Internal":
                return 6;
            default:
                return 100;
        }
    };
    var columns = [];
    var rowData = data instanceof Array? data[0] : data;
    for (var k in rowData){
        var column = {};
        column.data = k;
        column.title = k;
        column.className = 'gridtitle';
        column.targets = GetColumnPos(k);
        column.createdCell = function (td, cellData, rowData, row, col) {
            $(td).attr('title', cellData);//设置单元格title，鼠标移上去时悬浮框展示全部内容
        };
        column.data === 'SampleNo'?columns.unshift(column):columns.push(column);
    }
    {
        var column = {};
        column.data = "Internal";
        column.title = "Internal";
        column.className = 'gridtitle';
        column.targets = 6;
        // column.createdCell = function (td, cellData, rowData, row, col) {
        //     $(td).attr('title', cellData);//设置单元格title，鼠标移上去时悬浮框展示全部内容
        // };
        columns.push(column);
    }
    {
        var column = {};
        column.data = "External";
        column.title = "External";
        column.className = 'gridtitle';
        column.targets = 7;
        // column.createdCell = function (td, cellData, rowData, row, col) {
        //     $(td).attr('title', cellData);//设置单元格title，鼠标移上去时悬浮框展示全部内容
        // };
        columns.push(column);
    }
    columns.sort(sort_up);
    return columns;
}

function CreatGeneInfoTable2(tableID, data) {
    var GeneName = data[0]["GeneName"];
    var GeneID = data[0]["GeneID"];
    var Chr = data[0]["Chr"];
    var Start = data[0]['Start'];
    var End = data[0]['End'];
    var content = "<tbody><tr><td style='color: #f07b05;'>Gene Name</td><td style='color: dodgerblue;'>"+ data[0]["GeneName"] +"</td></tr><tr>" +
        "<td style='color: #f07b05;'>Gene ID</td><td style='color: violet'>"+"Ensembl:"+data[0]["GeneID"]+"</td></tr>" +
        "<tr><td style='color: #f07b05;'>Chromosomes</td><td style='color: lightseagreen'>"+ data[0]["Chr"] +"</td></tr>" +
        "<tr><td style='color: #f07b05;'>Start</td><td style='color: lightseagreen;'>"+ data[0]['Start'] +"</td></tr>" +
        "<tr><td style='color: #f07b05;'>End</td><td style='color: lightseagreen;'>"+ data[0]['End'] +"</td></tr>" +
        "<tr><td style='color: #f07b05;'>Strand</td><td>"+ data[0]['Strand'] +"</td></tr>" +
        "<tr><td style='color: #f07b05;'>Related Information</td><td><a class='button button-border button-rounded button-royal button-small' style='font-size: 16px' type='button' onclick='DoGeneDiseaseSearch(\"" + data[0]["GeneName"] + "\")'>Phenotypes</a>" + "&nbsp" +
        "<a class='button button-border button-rounded button-caution button-small' style='font-size: 16px' type='button' onclick='DoVCFSearch(\"" + data[0]["GeneName"] + "\")'>Variants</a>" + "&nbsp" +
        // "<a class='button button-border button-rounded button-highlight button-small' style='font-size: 16px' type='button' onclick='DoGFF3Search(\"" + data[0]["GeneName"] + "\")'>Transcription</a></td></tr>" + "&nbsp" +
        "<tr><td style='color: #f07b05;'>External Links</td><td><a class='btn btn-primary' role='button' href='http://grch37.ensembl.org/Homo_sapiens/Gene/Summary?g=" + GeneID + "'>Ensembl</a>" + "&nbsp" +
        "<a class='btn btn-success' role='button' href='http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&lastVirtModeType=default&lastVirtModeExtraState=&virtModeType=default&virtMode=0&nonVirtPosition=&position=chr" + Chr + "%3A" + Start + "-" + End + "'>UCSC</a>" + "&nbsp" +
        "<a class='btn btn-danger' role='button' href='https://www.genecards.org/cgi-bin/carddisp.pl?gene=" + GeneName + "'>GeneCard</a>" + "&nbsp" +
        "<a class='btn btn-warning' role='button' href='https://www.ncbi.nlm.nih.gov/gene/?term=" + GeneName + "'>NCBI</a>" + "&nbsp" +
        "<a class='btn btn-info' role='button' href='https://gtexportal.org/home/gene/" + GeneName + "'>GTExPortal" + "</a></td></tr>" +
        "<tr><td style='color: #f07b05;'>Ontology</td><td>" +
        //"<a class='button button-border button-rounded button-royal button-small' style='font-size: 16px' type='button' onclick='DoGeneDiseaseSearch(\"" + data[0]["GeneName"] + "\")'>HPO</a>" + "&nbsp" +
        "<a class='button button-border button-rounded button-caution button-small' style='font-size: 16px' type='button' onclick='DoVCFSearchwithOntology(\"" + data[0]["Chr"]+"\",\""+data[0]["Start"]+"\",\"" +data[0]["End"]+ "\",\"" +"ALL"+"\")'>Ontology</a>" + "&nbsp&nbsp&nbsp" +
        // "<a class='button button-border button-rounded btn-success button-small' style='font-size: 16px' type='button' onclick='DoVCFSearchwithOntology(\"" + data[0]["Chr"]+"\",\""+data[0]["Start"]+"\",\"" +data[0]["End"]+ "\",\"" +"GO"+"\")'>GO</a>" + "&nbsp" +
        // "<a class='button button-border button-rounded button-highlight button-small' style='font-size: 16px' type='button' onclick='DoVCFSearchwithOntology(\"" + data[0]["Chr"]+"\",\""+data[0]["Start"]+"\",\"" +data[0]["End"]+ "\",\"" +"SO"+"\")'>SO</a>" + "&nbsp" +
        // "<a class='button button-border button-rounded button-royal button-small' style='font-size: 16px' type='button' onclick='DoVCFSearchwithOntology(\"" + data[0]["Chr"]+"\",\""+data[0]["Start"]+"\",\"" +data[0]["End"]+ "\",\"" +"DO"+"\")'>DO</a></td></tr>" + "&nbsp" +
        "<label class=\"checkbox-inline\">" +
        "  <input type=\"checkbox\" id=\"inlineCheckbox1\" value=\"GO\" checked> GO" +
        "</label>" +
        "<label class=\"checkbox-inline\">" +
        "  <input type=\"checkbox\" id=\"inlineCheckbox2\" value=\"SO\" checked> SO" +
        "</label>" +
        "<label class=\"checkbox-inline\">" +
        "  <input type=\"checkbox\" id=\"inlineCheckbox3\" value=\"DO\" checked> DO" +
        "</label>" +
        "<label class=\"checkbox-inline\">" +
        "  <input type=\"checkbox\" id=\"inlineCheckbox3\" value=\"HPO\" checked> HPO" +
        "</label>" +
        "</td></tr>"+
        "</tbody>";
    $(tableID).html(content);
    $(tableID).parents('div').show();
    $('input[type="checkbox"]').change(function () {
        ShowColumn($(this).val());
    });

}

function CreatGeneInfoTable(tableID, data, IsRoot) {
    if (data.length === 0 && IsRoot){
        //如果没有得到数据 就自己初始化一个空表格
        $(tableID).DataTable({
            destroy: true,
            bSort: false,
            searching: false,
            bLengthChange: false,//去掉每页多少条框体
            bPaginate: false, //翻页功能
            bAutoWidth: false,//自动宽度
            paging: false, // 分页
            bInfo: true, //Showing x to x of x entries
            data:data,
            columns:[
                {"title":"GeneName"},
                {"title":"Gene ID"},
                {"title":"Chr"},
                {"title":"Start"},
                {"title":"End"},
                {"title":"Strand"},
                {"title":"Internal"},
                {"title":"External"}
            ]
        });
        return;
    }
    bLengthChange = IsRoot;
    bPaginate = IsRoot;
    paging = IsRoot;
    bInfo = IsRoot;

    var table = $(tableID).DataTable({
        destroy: true,
        bAutoWidth: true,//自动宽度
        paging: false, // 禁止分页
        bInfo : false, //Showing x to x of x entries
        searching: false,
        scrollX: !IsRoot,  //水平滚动条
        columns: CreatGeneInfoColums(data),
        data: data,
        ordering: true,
        "columnDefs": [// 定义操作列,######以下是重点########
            {
                "targets": 7,//操作按钮目标列
                "width": "35%",
                "render": function (data, type, row) {
                    var GeneName = row.GeneName;
                    var GeneID = row.GeneID;
                    var Chr = row.Chromosome;
                    var Start = row.Start;
                    var End = row.End;
                    var html = "<a class='btn btn-primary' role='button' href='http://grch37.ensembl.org/Homo_sapiens/Gene/Summary?g=" + GeneID + "'>Ensembl</a>" + "&nbsp" +
                        "<a class='btn btn-success' role='button' href='http://genome.ucsc.edu/cgi-bin/hgTracks?db=hg19&lastVirtModeType=default&lastVirtModeExtraState=&virtModeType=default&virtMode=0&nonVirtPosition=&position=chr" + Chr + "%3A" + Start + "-" + End + "'>UCSC</a>" + "&nbsp" +
                        "<a class='btn btn-danger' role='button' href='https://www.genecards.org/cgi-bin/carddisp.pl?gene=" + GeneName + "'>GeneCard</a>" + "&nbsp" +
                        "<a class='btn btn-warning' role='button' href='https://www.ncbi.nlm.nih.gov/gene/?term=" + GeneName + "'>NCBI</a>" + "&nbsp" +
                        "<a class='btn btn-info' role='button' href='https://gtexportal.org/home/gene/" + GeneName + "'>GTExPortal" + "</a>"
                    // "<a class='btn btn btn-dark' role='button' href='http://grch37.ensembl.org/Homo_sapiens/Gene/Summary?g="+ GeneID + "'>" +GeneName+"</a>";
                    return html;
                }
            },
            {
                "targets": 6,//操作按钮目标列
                "width": "25%",
                "render": function (data, type, row) {
                    var GeneName = row.GeneName;
                    var GeneID = row.GeneID;
                    var Chr = row.Chromosome;
                    var Start = row.Start;
                    var End = row.End;
                    var html = "<div class='button-group'>"+
                        "<a class='button button-glow button-border button-rounded button-primary button-small' type='button'>Diseases</a>" + "&nbsp" +
                        "<a class='button button-glow button-rounded button-caution button-small' role='button' href='#'>Associations</a>" + "&nbsp" +
                        "<a class='button button-glow button-rounded button-royal button-small' role='button' href='#'>Variants</a>" + "</div>";

                    //"<a class='btn btn-warning' role='button' href='https://www.ncbi.nlm.nih.gov/gene/?term=" + GeneName + "'>NCBI</a>" + "&nbsp" +
                        //"<a class='btn btn-info' role='button' href='https://gtexportal.org/home/gene/" + GeneName + "'>GTExPortal" + "</a>"
                    // "<a class='btn btn btn-dark' role='button' href='http://grch37.ensembl.org/Homo_sapiens/Gene/Summary?g="+ GeneID + "'>" +GeneName+"</a>";
                    return html;
                }
            },
            {
                "targets": 0,//操作按钮目标列
                "render": function (data, type, row) {
                    var GeneName = row.GeneName;
                    var html = "<a href='#' onclick='DoMainSearchManual(\"" + GeneName + "\")';>" + GeneName + "</a>"
                    return html;
                }
            }]
    });
}

//gene with relative disease
function CreatGeneDiseaseColums(data) {
    var sort_up = function (x,y) {
        return x.targets - y.targets;
    };
    var GetColumnPos = function(ColumnName){
        switch (ColumnName) {
            case "entrez_gene_id":
                return 0;
            case "entrez_gene_symbol":
                return 1;
            case "HPO_Term_Name":
                return 2;
            case "HPO_Term_ID":
                return 3;
            default:
                return 100;
        }
    };
    var columns = [];
    var rowData = data instanceof Array? data[0] : data;
    for (var k in rowData){
        var column = {};
        column.data = k;
        column.title = k;
        column.className = 'gridtitle';
        column.targets = GetColumnPos(k);
        column.createdCell = function (td, cellData, rowData, row, col) {
            $(td).attr('title', cellData);//设置单元格title，鼠标移上去时悬浮框展示全部内容
        };
        column.data === 'SampleNo'?columns.unshift(column):columns.push(column);
    }
    columns.sort(sort_up);
    return columns;
}

function CreatGeneDiseaseTable(tableID, data, IsRoot) {
    if (data.length === 0 && IsRoot){
        //如果没有得到数据 就自己初始化一个空表格
        $(tableID).DataTable({
            destroy: true,
            bSort: false,
            searching: false,
            bLengthChange: false,//去掉每页多少条框体
            bPaginate: false, //翻页功能
            bAutoWidth: false,//自动宽度
            paging: false, // 分页
            bInfo: true, //Showing x to x of x entries
            data:data,
            columns:[
                {"title":"entrez_gene_id"},
                {"title":"entrez_gene_symbol"},
                {"title":"HPO_Term_Name"},
                {"title":"HPO_Term_ID"}
            ]
        });
        return;
    }
    bLengthChange = IsRoot;
    bPaginate = IsRoot;
    paging = IsRoot;
    bInfo = IsRoot;

    var table = $(tableID).DataTable({
        destroy: true,
        bSort: true,
        searching: true,
        bLengthChange:bLengthChange,//去掉每页多少条框体
        bPaginate: true, //翻页功能
        bAutoWidth: true,//自动宽度
        "autoWidth": true,
        paging: paging, // 禁止分页
        bInfo : bInfo, //Showing x to x of x entries
        scrollX: !IsRoot,  //水平滚动条
        // columns:[
        //     {"title":"entrez_gene_id"},
        //     {"title":"entrez_gene_symbol"},
        //     {"title":"HPO_Term_Name"},
        //     {"title":"HPO_Term_ID"}
        // ],
        columns: CreatGeneDiseaseColums(data),
        data: data,
        ordering: true,
        "columnDefs": [// 定义操作列,######以下是重点########
            {
                "targets": 2,//操作按钮目标列
                "render": function (data, type, row) {
                    var DiseaseName = row.HPO_Term_Name;
                    var html ="<a href='#' onclick='DoDiseaseSearch(\""+ DiseaseName + "\")';>"+DiseaseName+"</a>"
                    return html;
                }
            }]
    });
}

//disease with its relative gene
function CreatDiseaseColums(data) {
    var sort_up = function (x,y) {
        return x.targets - y.targets;
    };
    var GetColumnPos = function(ColumnName){
        switch (ColumnName) {
            case "Disease":
                return 0;
            case "GeneName":
                return 1;
            case "seqname":
                return 2;
            case "start":
                return 3;
            case "end":
                return 4;
            default:
                return 100;
        }
    };
    var columns = [];
    var rowData = data instanceof Array? data[0] : data;
    for (var k in rowData){
        var column = {};
        column.data = k;
        column.title = k;
        column.className = 'gridtitle';
        column.targets = GetColumnPos(k);
        column.createdCell = function (td, cellData, rowData, row, col) {
            $(td).attr('title', cellData);//设置单元格title，鼠标移上去时悬浮框展示全部内容
        };
        column.data === 'SampleNo'?columns.unshift(column):columns.push(column);
    }
    columns.sort(sort_up);
    return columns;
}

function CreatDiseaseTable(tableID, data, IsRoot) {
    if (data.length === 0 && IsRoot){
        //如果没有得到数据 就自己初始化一个空表格
        $(tableID).DataTable({
            destroy: true,
            bSort: false,
            searching: true,
            bLengthChange: false,//去掉每页多少条框体
            bPaginate: false, //翻页功能
            bAutoWidth: false,//自动宽度
            paging: false, // 分页
            bInfo: true, //Showing x to x of x entries
            data:data,
            columns:[
                {"title":"Disease"},
                {"title":"GeneName"},
                {"title":"seqname"},
                {"title":"start"},
                {"title":"end"}
            ]
        });
        return;
    }
    bLengthChange = IsRoot;
    bPaginate = IsRoot;
    paging = IsRoot;
    bInfo = IsRoot;

    var table = $(tableID).DataTable({
        destroy: true,
        bSort: true,
        searching: true,
        bLengthChange:bLengthChange,//去掉每页多少条框体
        bPaginate: true, //翻页功能
        bAutoWidth: true,//自动宽度
        "autoWidth": true,
        paging: paging, // 禁止分页
        bInfo : bInfo, //Showing x to x of x entries
        scrollX: !IsRoot,  //水平滚动条
        columns: CreatDiseaseColums(data),
        data: data,
        ordering: true,
        "columnDefs": [// 定义操作列,######以下是重点########
            {
                "targets": 1,//操作按钮目标列
                "render": function (data, type, row) {
                    var GeneName = row.GeneName;
                    var html ="<a href='#' onclick='DoMainSearchManual(\""+ GeneName + "\")';>"+GeneName+"</a>"
                    return html;
                }
            }]
    });
}

//variants
function CreatVCFColums(data) {
    var sort_up = function (x,y) {
        return x.position - y.position;
    };
    var GetColumnPos = function(ColumnName){
        switch (ColumnName) {
            case "CHROM":
                return 0;
            case "POS":
                return 1;
            case "ID":
                return 2;
            case "REF":
                return 3;
            case "ALT":
                return 4;
            case "QUAL":
                return 5;
            case "FILTER":
                return 6;
            case "Info":
                return 7;
            case "Samples":
                return 8;
            default:
                return 100;
        }
    };
    var columns = [];
    var rowData = data instanceof Array? data[0] : data;
    for (var k in rowData){
        var column = {};
        column.data = k;
        column.title = k;
        column.className = 'gridtitle ';
        column.position = GetColumnPos(k);

        if (rowData[k] instanceof Object && (k === 'INFO' || k === 'SAMPLES' || k === 'FILTER')){
            column.className += 'details-control';
            column.targets = -1;
            column.orderable = false;
            column.defaultContent = '';
        }
        column.createdCell = function (td, cellData, rowData, row, col) {
            $(td).attr('title', cellData);//设置单元格title，鼠标移上去时悬浮框展示全部内容
        };
        column.data === 'SampleNo'?columns.unshift(column):columns.push(column);
    }
    columns.sort(sort_up);
    return columns;
}

function CreatVCFColums2() {
    // var sort_up = function (x,y) {
    //     return x.position - y.position;
    // };
    // var GetColumnPos = function(ColumnName){
    //     switch (ColumnName) {
    //         case "CHROM":
    //             return 0;
    //         case "POS":
    //             return 1;
    //         case "ID":
    //             return 2;
    //         case "REF":
    //             return 3;
    //         case "ALT":
    //             return 4;
    //         case "QUAL":
    //             return 5;
    //         case "FILTER":
    //             return 6;
    //         case "Info":
    //             return 7;
    //         case "Samples":
    //             return 8;
    //         default:
    //             return 100;
    //     }
    // };
    var CreateColumns = function (InfoFields) {
        var columns = [{"data": "CHROM", "title": "CHROM"},
            {"data": "POS", "title": "POS"},
            {"data": "ID", "title": "ID"},
            {"data": "REF", "title": "REF"},
            {"data": "ALT", "title": "ALT", "name": "ALT"},
            {"data": "QUAL", "title": "QUAL", "name": "QUAL"},
            {"data": "FILTER", "title": "FILTER", "name": "FILTER",'className':'details-control','targets':-1,'orderable':false,'defaultContent':' '},
            // {"data": "SAMPLES", "title": "SAMPLES", "name": "SAMPLES",'className':'details-control','targets':-1,'orderable':false,'defaultContent':' '},
           ];
        for (var ele in InfoFields) {
            var column = {};
            column.data = "INFO."+ele;
            column.title = ele;
            column.name = ele;
            columns.push(column)
            // column.className = 'gridtitle ';内容过长自动隐藏

        };
        var samplefield = {"data": "SAMPLES", "title": "SAMPLES", "name": "SAMPLES",'className':'details-control','targets':-1,'orderable':false,'defaultContent':' '}
        columns.push(samplefield)
        return columns;
    };

    var database = $('#Search_sel_DATABASE option:selected').val();
    $.get('/search/DoGetInfoFields/', {'database': database}, null, 'json')
        .done(function (data) {
            if (data === null || data.length === 0) {

            }else{
               return CreateColumns(data);
            }

        })
        .fail(function () {

        });

    // var columns = [];
    // var rowData = data instanceof Array? data[0] : data;
    // for (var k in rowData){
    //     var column = {};
    //     column.data = k;
    //     column.title = k;
    //     column.className = 'gridtitle ';
    //     column.position = GetColumnPos(k);
    //
    //     if (rowData[k] instanceof Object && (k === 'INFO' || k === 'SAMPLES' || k === 'FILTER')){
    //         column.className += 'details-control';
    //         column.targets = -1;
    //         column.orderable = false;
    //         column.defaultContent = '';
    //     }
    //     column.createdCell = function (td, cellData, rowData, row, col) {
    //         $(td).attr('title', cellData);//设置单元格title，鼠标移上去时悬浮框展示全部内容
    //     };
    //     column.data === 'SampleNo'?columns.unshift(column):columns.push(column);
    // }
    // columns.sort(sort_up);
    // return columns;
}


function CreatVCFTable(tableID, data, IsRoot) {
    if (data.length === 0 && IsRoot){
        if ($.fn.DataTable.isDataTable(tableID)) {
            $(tableID).DataTable().clear();
            $(tableID).DataTable().destroy();
        }

        //如果没有得到数据 就自己初始化一个空表格
        $(tableID).DataTable({
            destroy: true,
            bSort: false,
            searching: false,
            bLengthChange: false,//去掉每页多少条框体
            bPaginate: false, //翻页功能
            bAutoWidth: false,//自动宽度
            paging: false, // 分页
            bInfo: true, //Showing x to x of x entries
            data:data,
            columns:[
                {"title":"CHROM"},
                {"title":"POS"},
                {"title":"ID"},
                {"title":"REF"},
                {"title":"ALT"},
                {"title":"QUAL"},
                {"title":"FILTER"},
                {"title":"Info"}
                // {"title":"Samples"}
            ]
        });
        return;
    }
    bLengthChange = IsRoot;
    bPaginate = IsRoot;
    paging = IsRoot;
    bInfo = IsRoot;
    var table = $(tableID).DataTable({
        destroy: true,
        bSort: true,
        searching: IsRoot,
        bLengthChange:bLengthChange,//去掉每页多少条框体
        bPaginate: true, //翻页功能
        bAutoWidth: true,//自动宽度
        "autoWidth": true,
        paging: paging, // 禁止分页
        bInfo : bInfo, //Showing x to x of x entries
        scrollX: !IsRoot,  //水平滚动条
        columns: IsRoot?CreatVCFColums2():CreatVCFColums(data),
        data: data,
        ordering: true,
        colReorder: {
          order: [0]
        },
        "fnCreatedRow": function (nRow, aData, iDataIndex) {
            var i = 0;
            for (var k in aData){
                var isobject = $('td:eq('+i+')', nRow).hasClass("details-control");
                if (isobject){
                    //$('td:eq('+i+')', nRow).html("<span class='row-details fa fa-plus-square-o'>&nbsp;" + $('td:eq('+i+')', nRow).attr("title")+"</span>");
                    $('td:eq('+i+')', nRow).html("<span class='row-details fa fa-plus-square-o'></span>");
                }
                ++i;
            }
        }
    });

    $(tableID).on('click', ' tbody td.details-control', function () {
        var OpenCell = function (obj) {
            ++tableIndex;
            row.child(format2(tableIndex)).show();
            $(obj).children('span').removeClass(IconPlus).addClass(IconMinus);
            var childdata = table.cell(obj).data();
            var tmp = [];
            if (childdata instanceof Array){
                tmp = childdata;
            }else{
                tmp.push(childdata);
            }
            CreatVCFTable('#DataTable' + tableIndex, tmp, false);
        };
        var Tr = $(this).parents('tr');
        var row = table.row(Tr);
        if (row.child.isShown()) {
            row.child.hide();
            var span = Tr.find('span.fa-minus-square-o');
            if ($(this).children('span')[0] === span[0]) {
                // This cell is already open - close it
                $(this).children('span').removeClass(IconMinus).addClass(IconPlus);
            } else {
                //other cell is open, close other cell and then open current cell
                span.removeClass(IconMinus).addClass(IconPlus);
                OpenCell(this);
            }
        }
        else {
            // Open this row (the format() function would return the data to be shown)
            OpenCell(this);
        }

    });
}

function CreatVCFTableWithOntology(tableID, data, IsRoot, ontology) {
    //$.fn.dataTable.ext.errMode = 'none';       //屏蔽掉报错弹窗

    if (data.length === 0 && IsRoot){
        if ($.fn.DataTable.isDataTable(tableID)) {
            $(tableID).DataTable().clear();
            $(tableID).DataTable().destroy();
        }
        //如果没有得到数据 就自己初始化一个空表格
        $(tableID).DataTable({
            destroy: true,
            bSort: false,
            searching: false,
            bLengthChange: false,//去掉每页多少条框体
            bPaginate: false, //翻页功能
            bAutoWidth: false,//自动宽度
            paging: false, // 分页
            bInfo: true, //Showing x to x of x entries
            data:data,
            columns:[
                {"title":"CHROM"},
                {"title":"POS"},
                {"title":"ID"},
                {"title":"REF"},
                {"title":"ALT"},
                {"title":"QUAL"},
                {"title":"FILTER"},
                {"title":"Info"}
                // {"title":"Samples"}
            ]
        });
        return;
    }
    bLengthChange = IsRoot;
    bPaginate = IsRoot;
    paging = IsRoot;
    bInfo = IsRoot;
    var table = $(tableID).DataTable({
        destroy: true,
        bSort: true,
        searching: IsRoot,
        bLengthChange:bLengthChange,//去掉每页多少条框体
        bPaginate: true, //翻页功能
        bAutoWidth: true,//自动宽度
        "autoWidth": true,
        paging: paging, // 禁止分页
        bInfo : bInfo, //Showing x to x of x entries
        scrollX: true,  //水平滚动条
        columnDefs: [{"defaultContent": "", "targets": "_all"}],
        columns:[
                {"data":"CHROM","title":"CHROM"},
                {"data":"POS","title":"POS"},
                {"data":"ID","title":"ID"},
                {"data":"REF","title":"REF"},
                {"data":"ALT","title":"ALT","name":"ALT"},
                {"data":"INFO.GENEINFO","title":"GENEINFO"},
                {"data":"GO","title":"GO","name":"GO"},
                {"data":"INFO.CLNVCSO","title":"SO (CLNVCSO)", "name":"SO"},
                {"data":"INFO.MC", "title":"SO (MC)", "name":"SO"},
                {"data":"DO", "title":"DO", "name":"DO"},
                {"data":"HP", "title":"HP", "name":"HPO"},
                {"data":"INFO.CLNDISDB","title":"CLNDISDB"},
            ],
        data: data,
        ordering: true,
        colReorder: {order: [0]}
    });
}


//GFF3
function CreatGFF3Colums(data) {
    var sort_up = function (x,y) {
        return x.position - y.position;
    };
    var GetColumnPos = function(ColumnName){
        switch (ColumnName) {
            case "seqid":
                return 0;
            case "source":
                return 1;
            case "type":
                return 2;
            case "start":
                return 3;
            case "end":
                return 4;
            case "score":
                return 5;
            case "strand":
                return 6;
            case "phase":
                return 7;
            case "attributes":
                return 8;
            default:
                return 100;
        }
    };
    var columns = [];
    var rowData = data instanceof Array? data[0] : data;
    for (var k in rowData){
        var column = {};
        column.data = k;
        column.title = k;
        column.className = 'gridtitle ';
        column.position = GetColumnPos(k);

        if (rowData[k] instanceof Object && (k === 'attributes')){
            column.className += 'details-control';
            column.targets = -1;
            column.orderable = false;
            column.defaultContent = '';
        }
        column.createdCell = function (td, cellData, rowData, row, col) {
            $(td).attr('title', cellData);//设置单元格title，鼠标移上去时悬浮框展示全部内容
        };
        column.data === 'SampleNo'?columns.unshift(column):columns.push(column);
    }
    columns.sort(sort_up);
    return columns;
}


function CreatGFF3Table(tableID, data, IsRoot) {
    if (data.length === 0 && IsRoot){
        if ($.fn.DataTable.isDataTable(tableID)) {
            $(tableID).DataTable().clear();
            $(tableID).DataTable().destroy();
        }

        //如果没有得到数据 就自己初始化一个空表格
        $(tableID).DataTable({
            destroy: true,
            bSort: false,
            searching: false,
            bLengthChange: false,//去掉每页多少条框体
            bPaginate: false, //翻页功能
            bAutoWidth: false,//自动宽度
            paging: false, // 分页
            bInfo: true, //Showing x to x of x entries
            data:data,
            columns:[
                {"title":"seqid"},
                {"title":"source"},
                {"title":"type"},
                {"title":"start"},
                {"title":"end"},
                {"title":"strand"},
                {"title":"phase"},
                {"title":"attributes"}
                // {"title":"Samples"}
            ]
        });
        return;
    }
    bLengthChange = IsRoot;
    bPaginate = IsRoot;
    paging = IsRoot;
    bInfo = IsRoot;
    var table = $(tableID).DataTable({
        destroy: true,
        bSort: true,
        searching: true,
        bLengthChange:bLengthChange,//去掉每页多少条框体
        bPaginate: true, //翻页功能
        bAutoWidth: true,//自动宽度
        "autoWidth": true,
        paging: paging, // 禁止分页
        bInfo : bInfo, //Showing x to x of x entries
        scrollX: !IsRoot,  //水平滚动条
        columns: CreatGFF3Colums(data),
        data: data,
        ordering: true,
        colReorder: {
          order: [0]
        },
        "fnCreatedRow": function (nRow, aData, iDataIndex) {
            var i = 0;
            for (var k in aData){
                var isobject = $('td:eq('+i+')', nRow).hasClass("details-control");
                if (isobject){
                    //$('td:eq('+i+')', nRow).html("<span class='row-details fa fa-plus-square-o'>&nbsp;" + $('td:eq('+i+')', nRow).attr("title")+"</span>");
                    $('td:eq('+i+')', nRow).html("<span class='row-details fa fa-plus-square-o'>&nbsp;" + "</span>");
                }
                ++i;
            }
        }
    });

    $(tableID).on('click', ' tbody td.details-control', function () {
        var OpenCell = function (obj) {
            ++tableIndex;
            row.child(format2(tableIndex)).show();
            $(obj).children('span').removeClass(IconPlus).addClass(IconMinus);
            var childdata = table.cell(obj).data();
            var tmp = [];
            if (childdata instanceof Array){
                tmp = childdata;
            }else{
                tmp.push(childdata);
            }
            CreatVCFTable('#DataTable' + tableIndex, tmp, false);
        };
        var Tr = $(this).parents('tr');
        var row = table.row(Tr);
        if (row.child.isShown()) {
            row.child.hide();
            var span = Tr.find('span.fa-minus-square-o');
            if ($(this).children('span')[0] === span[0]) {
                // This cell is already open - close it
                $(this).children('span').removeClass(IconMinus).addClass(IconPlus);
            } else {
                //other cell is open, close other cell and then open current cell
                span.removeClass(IconMinus).addClass(IconPlus);
                OpenCell(this);
            }
        }
        else {
            // Open this row (the format() function would return the data to be shown)
            OpenCell(this);
        }

    });
}


//重构返回的json数据
function ParseJsonData(strdata) {
    var data=eval('('+strdata+')');
    // var data = JSON.parse( strdata );
    var result = [];
    for (var line in data) {
        var rowJson = {};
        var info_row = {};
        var filter_row = {};
        var rowData = data[line];
        //保证顺序 可以让datatables 按序显示
        rowJson["CHROM"] = rowData["CHROM"];
        rowJson["POS"] = rowData["POS"];
        rowJson["ID"] = rowData["ID"];
        rowJson["REF"] = rowData["REF"];
        rowJson["ALT"] = rowData["ALT"];
        rowJson["QUAL"] = rowData["QUAL"];
        for (var key in rowData) {
            switch (key) {
                case "CHROM":
                case "POS":
                case "ID":
                case "REF":
                case "QUAL":
                case "Samples":
                case "ALT":
                    break;
                default:
                    //区分filter 和 info
                    if (key.match(/^FILTER_/g)) {
                        filter_row[key] = rowData[key]
                    } else {
                        info_row[key] = rowData[key];
                    }
                    break;
            }
        }
        rowJson["FILTER"] = filter_row;
        rowJson["Info"] = info_row;
        rowJson["Samples"] = rowData["Samples"];
        result.push(rowJson);
    }
    return result;
}

function Search_AddRow() {
    var html_bar = "  <div id='Search_row_" + Search_rownum + "' >" +
        "                        <div class=\"layui-inline Search_layui_inline_1 d2\">" +
        "                            <form class=\"layui-form\" action=\"\">" +
        "                                <select name=\"Search_sel_Conjunction\" lay-verify=\"\" lay-search>" +
        "                                    <option value=\"AND\" selected>AND</option>" +
        "                                    <option value=\"OR\">OR</option>" +
        "                                    <option value=\"NOT\">NOT</option>" +
        "                                </select>" +
        "                            </form>" +
        "                        </div>" +
        "                        <div class=\"layui-inline d2 Search_layui_inline_2\">" +
        "                            <input type=\"text\" name=\"key\" autocomplete=\"on\" class=\"layui-input\">" +
        "                        </div>" +
        "                        <div class=\"layui-inline d2 Search_layui_inline_3\">" +
        "                            <form class=\"layui-form\" action=\"\">" +
        "                                <select name=\"Search_sel_Fields\" lay-verify=\"\" lay-search" +
        "                                        lay-filter=\"lay_Search_sel_Fields\">" +
        "                                    <option value=\"eq\" selected>=</option>" +
        "                                    <option value=\"ne\">!=</option>" +
        "                                    <option value=\"gte\">&ge;</option>" +
        "                                    <option value=\"gt\">&gt;</option>" +
        "                                    <option value=\"lt\">&lt;</option>" +
        "                                    <option value=\"lte\">&le;</option>" +
        "                                </select>" +
        "                            </form>" +
        "                        </div>" +
        "                        <div class=\"layui-inline d2 Search_layui_inline_4\">" +
        "                            <input type=\"text\" name=\"value\" autocomplete=\"off\" class=\"layui-input\">" +
        "                        </div>" +
        "                <div class=\"layui-inline Search_layui_inline_5\">" +
        "                    <div class=\"layui-btn-group\">" +
        "                        <button onclick='del(" + Search_rownum + ")' class=\"layui-btn layui-btn-primary layui-btn-sm\" id='Search_btn_delrow_" + Search_rownum + "'\">" +
        "                            <i class=\"layui-icon\">&#xe640;</i>" +
        "                        </button>" +
        "                    </div>" +
        "                </div>" +
        "             </div>";

    $('#exactbar_contend').append(html_bar);

    Search_rownum++;
    //render();
    layui.use('form', function() {
        var form = layui.form; //只有执行了这一步，部分表单元素才会自动修饰成功
        form.render();
    });
    Search_bind_autocomplete($("input[name='key']"),true);
}

function  del(id) {
    $("#Search_row_"+id).remove();
}

function Search_reset() {
    //删除新增的行
    $("#exactbar_contend").children().each(function () {
        var strID = $(this).attr('id');
        if (strID != null){
            var id = strID.match(/\d+/);
            del(id);
        }
    });
    //重置原有表单
    $("#exactbar_contend").children().each(function () {
        $(this).each(function () {
            $(this).find("select[name='Search_sel_Fields']").val("eq");
            $(this).find("input[name='key']").val("");
            $(this).find("input[name='value']").val("");
        });
    });
    // $("#Search_input_fuzzy").val("");
    //刷新
    layui.use('form', function() {
        var form = layui.form;
        form.render();
    });
}

function Search_exactSearch(){
    //clear old tables
    ClearOldData();
    var data = new Array();
    var row=0,column=0;
    var GetDataFunc = function(){
        $("#exactbar_contend").children().each(function () {
            data[row] = new Array();
            column = 0;
            $(this).each(function () {
                if ($(this).find("select[name='Search_sel_Conjunction']").val() != null) {
                    data[row][column++] = $(this).find("select[name='Search_sel_Conjunction']").val();
                }else{
                    data[row][column++] = "AND";
                }
                data[row][column++] = $(this).find("input[name='key']").val();
                data[row][column++] = $(this).find("select[name='Search_sel_Fields']").val();
                data[row][column++] = $(this).find("input[name='value']").val();
            });
            row++;
        });
        return data;
    };
    var FormatData = function (data) {
        if (IsEmpty(data[0][1])) return data;
        for (var i in data){
            strkey = data[i][1].toUpperCase();
            if (strkey == 'POS'){
                data[i][3] = parseInt(data[i][3]);
            }
            if (!IsEmpty(data[i][3]) && !isNaN(data[i][3])){
                data[i][3] = parseInt(data[i][3]);
            }
            // if (strkey == 'ALT'){
            //     data[i][1] = 'ALT.1'
            // }
        }
        return data;
    };
    var ConvertData2Json = function(data){
        if (IsEmpty(data[0][1])) return;

        var len = data.length;
        //convert NOT to AND
        line = [];
        for (var i =0; i < len; ++i) {
            var sqlJson = {};
            if (data[i][0] == 'NOT'){
                switch (data[i][2]) {
                    case 'eq':
                        var tmp = {};
                        tmp["$not"] = data[i][3];
                        sqlJson[data[i][1].toUpperCase()] = tmp;
                        break;
                    default:
                        var tmp1 = {}, tmp2 = {};
                        tmp1["$" + data[i][2]] = data[i][3];
                        tmp2["$not"] = tmp1;
                        sqlJson[data[i][1].toUpperCase()] = tmp2;
                        break;
                }
                linedata = {};
                linedata.key = "AND";   //change to AND
                linedata.value = sqlJson;
                line.push(linedata);
            }else{
                switch (data[i][2]) {
                    case 'eq':
                        sqlJson[data[i][1].toUpperCase()] = data[i][3];
                        break;
                    default:
                        var tmp = {};
                        tmp["$" + data[i][2]] = data[i][3];
                        sqlJson[data[i][1].toUpperCase()] = tmp;
                        break;
                }
                linedata = {};
                linedata.key = data[i][0];
                linedata.value = sqlJson;
                line.push(linedata);
            }
        }
        //merge AND
        var lineAND = [];
        for (var i =0; i < line.length; ++i) {
            if (line[i]['key'] == 'AND'){
                var start = i;
                while (i + 1 < line.length) {
                    if (line[i + 1]['key'] == 'AND'){
                        i++;
                    }else{
                        var end = i;
                        var value = [];
                        for (var j = Math.max(start-1,0); j <= end; j++){
                            value.push(line[j]['value']);
                        }
                        var value_and = {};
                        value_and['$and'] = value;
                        lineAND.push(value_and);
                        break;
                    }
                }
                if (i + 1 >= line.length){
                    var end = i;
                    var value = [];
                    for (var j = Math.max(start - 1, 0); j <= end; j++) {
                        value.push(line[j]['value']);
                    }
                    var value_and = {};
                    value_and['$and'] = value;
                    lineAND.push(value_and);
                    break;
                }
            }else {
                lineAND.push(line[i]['value']);
            }
        }
        //merge OR
        if (lineAND.length != 1){
            value_or = [];
            for (var i = 0; i < lineAND.length - 1; ++i) {
                value_or.push(lineAND[i]);
            }
            var value_tmp = {};
            value_tmp['$or'] = value_or;
            var result = {};
            result = value_tmp;
            return result;
        }else{
            return lineAND[0];
        }
    };
    var data = FormatData(GetDataFunc());
    var sqljson = ConvertData2Json(data);
    var database = $('#Search_sel_DATABASE option:selected').val();
    if (IsEmpty(sqljson) || IsEmpty(database))   return;
    $.busyLoadFull("show", { spinner: "accordion"});
    var condition = {'condition': JSON.stringify(sqljson), 'database':database};
    $.post('/search/doexactSearch/', condition, null, 'json')
        .done(function (data) {
            if (data === null || data.length === 0) {
                layui.use('layer', function () {
                    var layer = layui.layer;
                    layer.msg('no related results have been found');
                });
                $.busyLoadFull("hide");
            }
            $("#DataTable").parents('.divInContainer').css({"background-color": 'white'});
            CreatVCFTable('#DataTable', data, true);
            $.busyLoadFull("hide");
        })
        .fail(function () {
            $.busyLoadFull("hide");
        })
}

//input绑定/解除 autocomplete
function Search_bind_autocomplete(node,isbind) {
    if (isbind){
        var selsource = [
                "GENENAME",
                "CHROM",
                "POS",
                "ID",
                "QUAL",
                "REF",
                "ALT",
                "FILTER.FILTER_PASS"
            ];
        node.autocomplete({
            minLength: 0,
            source: selsource,
            disabled:false,
            focus :function () {
                return false;
            },
            select: function(event, ui){
                $this = $(this);
                setTimeout(function () {
                    $this.blur();
                }, 1);
            }
        }).focus(function(){
                $(this).autocomplete("search");
                return false;
            }
        );

    }else {
        node.autocomplete({
            disabled:true
        });
    }
}

//clear old data
function ClearOldData() {
    $(".divInContainer").css({"background-color":'transparent'});
    var htmlcontent = "<table id=\"GeneInfoTable\" class=\"info_table\" style=\"width:initial\">";
    $('#GeneInfoTable').parents('.divInContainer').html(htmlcontent);

    var SOTablecontent = "<div id='SOTable'></div>";
    $('#SOTable').parents('.divInContainer').html(SOTablecontent);

    var OntologyTablecontent = "<table id=\"DataTableontology\" class=\"table table-striped table-bordered table-hover\">";
    $('#DataTableontology').parents('.divInContainer').html(OntologyTablecontent);

    var list = new Array("GeneDiseaseTable", "GFF3Table", "DataTable", "DiseaseDataTable")
    list.forEach(function (value) {
        var htmlcontent = "<table id= " + value + " class= 'table table-striped table-bordered table-hover' style= 'table-layout:fixed;width: inherit'></table>"
        $('#' + value).parents('.divInContainer').html(htmlcontent);
    });
}

function ShowColumn(key) {
    var table = $("#DataTableontology").DataTable();
    var column = table.column(key + ":name");
    column.visible( ! column.visible() );
}