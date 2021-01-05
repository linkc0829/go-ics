/**
 * Implements cookie-less JavaScript session variables
 * v1.0
 *
 * By Craig Buckler, Optimalworks.net
 * http://dreamerslab.com/blog/tw/javascript-session/
 *
 */
  
if (JSON && JSON.stringify && JSON.parse) var Session = Session || (function() {
  
    // cache window 物件
    var win = window.top || window;
     
    // 將資料都存入 window.name 這個 property
    var store = (win.name ? JSON.parse(win.name) : {});
     
    // 將要存入的資料轉成 json 格式
    function Save() {
      win.name = JSON.stringify(store);
    };
     
    // 在頁面 unload 的時候將資料存入 window.name
    if (window.addEventListener) window.addEventListener("unload", Save, false);
    else if (window.attachEvent) window.attachEvent("onunload", Save);
    else window.onunload = Save;
   
    // public methods
    return {
     
      // 設定一個 session 變數
      set: function(name, value) {
        store[name] = value;
      },
       
      // 列出指定的 session 資料
      get: function(name) {
        return (store[name] ? store[name] : undefined);
      },
       
      // 清除資料 ( session )
      clear: function() { store = {}; },
       
      // 列出所有存入的資料
      dump: function() { return JSON.stringify(store); }
    
    };
    
   })();
  
   async function checkMyStatus(){
    
    let tokenString = Session.get('token_type') + ' ' + Session.get('token');
    let url = window.location.href.split('/');
    let id = url[url.length-1];
  
    query = '{\
        me{\
          id\
          friends{\
            id\
          }\
        }\
      }';
  
    await superagent
    .post('/api/v1/graph')
    .set('accept', 'json')
    .set('Authorization', tokenString)
    .send({'Query': query,})
    .then(function (res) {
        clearMessage()
        let out = res.body.data.me.friends;
        console.log(out);
        for(let i = 0; i < out.length; i++){
          if(out[i].id == id){
            document.querySelector('#addFriend').style.display = 'none';
            document.querySelector('#unfriend').style.display = 'block';
          }
        }
        //watching my own profile, hide friend sector
        if(res.body.data.me.id == id){
          document.querySelector('#addFriend').style.display = 'none';
          document.querySelector('#unfriend').style.display = 'none';
        }
        let myID = res.body.data.me.id;
        document.querySelector('#myProfile').href = '/profile/' + myID;
        document.querySelector('#myHistory').href = '/history/' + myID;
        document.querySelector('#myFriends').href = '/friends/' + myID;
        document.querySelector('#myFollowers').href = '/followers/' + myID;
  
        input.value = '';
    })
    .catch(function (err) {
        if (err.response) {
            showMessage(err.response.message);
        }
    });
   }
  
  //get UserId through gql API
  async function getUserProfile(currentUser){
    let tokenString = Session.get('token_type') + ' ' + Session.get('token');
    let url = window.location.href.split('/');
    let id = url[url.length-1];
  
    query = '{\
        getUser(id: "' + id + '"){\
          id\
          userId\
          email\
          nickName\
          friends{\
            id\
          }\
          followers{\
            id\
          }\
        }\
      }';
  
    await superagent
    .post('/api/v1/graph')
    .set('accept', 'json')
    .set('Authorization', tokenString)
    .send({'Query': query,})
    .then(function (res) {
        clearMessage()
        let out = res.body.data.getUser;
        currentUser.id = out.id;
        currentUser.userId = out.userId;
        currentUser.nickName = out.nickName;
        currentUser.email = out.email;
        currentUser.friends = [...out.friends];
        currentUser.followers = [...out.followers];
  
        let resp = document.getElementById('response');
        resp.innerHTML = JSON.stringify(res.body);
  
        document.querySelector('#profile').href = '/profile/' + out.id;
        document.querySelector('#history').href = '/history/' + out.id;
  
        input.value = '';
    })
    .catch(function (err) {
        if (err.response) {
            showMessage(err.response.message);
        }
    });
  }
  
  async function getAccessToken(jwt){
  await superagent
    .get('/api/v1/auth/ics/refresh_token')
    .set('accept', 'json')
    .then(function (res) {
        clearMessage();
        console.log(res.body);
        jwt.token = res.body.token;
        jwt.token_expiry = res.body.token_expiry;
        jwt.token_type = res.body.type;
        setSession(jwt);
        input.value = '';
    })
    .catch(function (err) {
      //logout if err occur
      if (err.response) {
        console.log(err);
      }
      let url = window.location.href.split('/');
      if(url.length > 4){
        logout();
      }
    });
  }
  
  function logout(){
    jwt.token_expiry = new Date('-1');
    jwt.token = '';
    setSession(jwt);
  
    //ask server to set refresh token invalid
    var request = new XMLHttpRequest(); 
    request.open('GET', '/api/v1/auth/ics/logout', true);
    request.send();
    request.onerror = showMessage();
    window.location.replace("/");
  }
  
  function setJWTFromSession(jwt){
    jwt.token = Session.get('token');
    jwt.token_expiry = new Date(Session.get('token_expiry'));
    jwt.token_type = Session.get('token_type');
  }
  
  function setSession(jwt){
    Session.set('token', jwt.token);
    Session.set('token_expiry', jwt.token_expiry);
    Session.set('token_type', jwt.type);
  }
  
  var jwt = {
    token: Session.get('token'),
    token_expiry: new Date(Session.get('token_expiry')),
    token_type: Session.get('token_type'),
  };
  
  async function checkToken(jwt){
    await getAccessToken(jwt);
  }
  
  //check if user login
  function isLogin(){
    //1. if token is expire, try to get new access token
    if(jwt.token_expiry < new Date() && jwt.token != '' && typeof(jwt.token) != 'undefined'){
      checkToken();
    }
    //2. check if token is invalid
    if(jwt.token_expiry < new Date() || jwt.token == '' || typeof(jwt.token) == 'undefined'){
      return false
    }
    //3. token is valid
    document.querySelector('#login').style.display = 'none';
    document.querySelector('#signup').style.display = 'none';
    document.querySelector('#logout').style.display = 'block';
    return true;
  }

  function reloadHistory(range){
      isLogin();
      initPortfolio(currentUser, INCOME, range);
      initPortfolio(currentUser, COST, range);
  }
  
  var currentUser = {};
  if(isLogin()){
    getUserProfile(currentUser).then((res)=>{
      initPortfolio(currentUser, INCOME, 30);
      initPortfolio(currentUser, COST, 30);
    }).then((res)=>{
      checkMyStatus();
    });
  }
  
  const COST = 'COST';
  const INCOME = 'INCOME';
  
  function casePortfolioType(type, upper){
    if(type == COST){
      return upper? 'Cost':'cost';
    }
    else{
      return upper? 'Income':'income';
    }
  }
  
  function createPortfolioRecord(type){
  
    let ret = "<div class='form-row'>\
    <div class='col-md-7 border'>\
    <label for='description' id='description_label' style='width:100%;'>" + casePortfolioType(type, true) + " Description</label>\
    <input type='text' class='form-control' name='description' placeholder='" + casePortfolioType(type, true) + " Description' id='description_input' style='display: none;'>\
    </div>\
    <div class='col-md-3 border'>\
    <label for='amount' id='amount_label' style='width:100%;'>Amount: $888</label>\
    <input type='text' class='form-control' name='amount' placeholder='888' id='amount_input' style='display: none;'>\
    </div>\
    <div class='col-md-2'>\
    <button class='btn btn-secondary' id='update'>Update</button>\
    </div>\
    </div>\
    <div class='form-row'>\
    <div class='col-md-3 border'>"
  
    if(type == INCOME){
      ret += "<label for='category' id='category_label' style='width:100%;'>INVESTMENT</label>\
      <select name='category' id='category_input' class='custom-select' style='display: none;'>\
        <option selected>Choose a category</option>\
        <option value='INVESTMENT'>INVESTMENT</option>\
        <option value='SALARY'>SALARY</option>\
        <option value='PARTTIME'>PART TIME</option>\
        <option value='OTHERS'>OTHERS</option>\
      </select>"
    }
    else{
      ret += "<label for='category' id='category_label' style='width:100%;'>LEARNING</label>\
      <select name='category' id='category_input' style='display: none;' class='custom-select'>\
        <option selected>Choose a category</option>\
        <option value='INVESTMENT'>INVESTMENT</option>\
        <option value='DAILY'>DAILY</option>\
        <option value='LEARNING'>LEARNING</option>\
        <option value='CHARITY'>CHARITY</option>\
        <option value='OTHERS'>OTHERS</option>\
      </select>"
    }
    ret +="</div>\
    <div class='col-md-3 border'>\
    <label for='occurDate' id='occurDate_label' style='width:100%;'>@ 2021-01-01</label>\
    <input type='date' class='form-control' name='occurDate' placeholder='occurDate' min='' value='2021-01-01' style='display: none;' id='occurDate_input'>\
    </div>\
    <div class='col-md-2 border'>\
    <label id='vote_label'>Vote: 555</label>\
    </div>\
    <div class='col-md-2'>\
    <button class='btn btn-primary' id='vote'>Vote</button>\
    </div>\
    <div class='col-md-2'>\
    <button class='btn btn-danger' id='delete'>Delete</button>\
    </div>\
    </div>"
    return ret;
  }
  //load user portfolio, for init or reload
  async function initPortfolio(user, type, range){
    let target = '/api/v1/user/' + user.id + (type==INCOME? '/income': '/cost') + '/history?range=' + range;
    let portfolioList = (type==INCOME? document.querySelector('#income-list'):document.querySelector('#cost-list'));
    portfolioList.innerHTML = '';
    await superagent
        .get(target)
        .set('accept', 'json')
        .set('Authorization', jwt.token)
        .then(function (res) {
            clearMessage();
            console.log(res);
            let portfolio;
            if(type == INCOME){
              portfolio = res.body.GetUserIncomeHistory;
            }
            else{
              portfolio = res.body.GetUserCostHistory;
            }
            for (let i = 0; i < portfolio.length; i++) {
              addPortfolio(portfolio[i], type);
          }
        })
        .catch(function (err) {
            if (err.reponse) {
                showMessage(err.reponse.message);
            }
        });
  }
  
  /* Add a Portfolio item. */
  function addPortfolio(res, type) {
    let id = res.Id;
    let description = res.Description;
    let amount = res.Amount;
    let category = res.Category;
    let date = new Date(res.OccurDate);
    let date_month = date.getMonth()+1;
    let occurDate = date.getFullYear() + '-' + date_month + '-' + date.getDate();
    let vote = res.Vote.length;
  
    let form = document.createElement('form');
    form.setAttribute('id', id);
    form.innerHTML = createPortfolioRecord(type)
    let portfolioList = document.querySelector((type==INCOME? '#income-list': '#cost-list'));
    portfolioList.appendChild(form);
   
    let description_label = form.querySelector('#description_label');
    description_label.innerText = description;
    description_label.htmlFor = 'description_' + id;
    //description_label.addEventListener('click', ()=>{ loadPortfolioItem(id, 'description', type)})
    let description_input = form.querySelector('#description_input');
    description_input.name = 'description_' + id;
    description_input.value = description;
  
    let amount_label = form.querySelector('#amount_label');
    amount_label.innerText = amount;
    amount_label.htmlFor = 'amount_' + id;
    //amount_label.addEventListener('click', ()=>{ loadPortfolioItem(id, 'amount', type)})
    let amount_input = form.querySelector('#amount_input');
    amount_input.name = 'amount_' + id;
    amount_input.value = amount;
  
    let category_label = form.querySelector('#category_label');
    category_label.innerText = category;
    category_label.htmlFor = 'category_' + id;
    //category_label.addEventListener('click', ()=>{ loadPortfolioItem(id, 'category', type)})
    let category_input = form.querySelector('#category_input');
    category_input.name = 'category_' + id;
    category_input.value = category;
  
    let occurDate_label = form.querySelector('#occurDate_label');
    occurDate_label.innerText = occurDate;
    occurDate_label.htmlFor = 'occueDate_' + id;
    //occurDate_label.addEventListener('click', ()=>{ loadPortfolioItem(id, 'occurDate', type)})
    let occurDate_input = form.querySelector('#occurDate_input');
    occurDate_input.name = 'occueDate_' + id;
    occurDate_input.value = occurDate;
  
    let vote_label = form.querySelector('#vote_label');
    vote_label.innerText = vote;
    
  }
  
  function showMessage(msg) {
    let div = document.createElement('div');
  
    div.classList.add('alert');
    div.classList.add('alert-warning');
    div.setAttribute('role', 'alert');
  
    div.innerText = msg;
  
    let message = document.getElementById('message');
  
    message.innerHTML = '';
    message.appendChild(div);
  }
  
  function clearMessage() {
    let message = document.getElementById('message');
  
    message.innerHTML = '';
  }
  
  function addFriend(){
    isLogin();
    let tokenString = Session.get('token_type') + ' ' + Session.get('token');
    let url = window.location.href.split('/');
    let id = url[url.length-1];
    let addF = document.querySelector('#addFriend');
    let unF = document.querySelector('#unfriend');
    
    let mutation = 'mutation{\
        addFriend(id:"' + id + '"){\
            id\
            friends{\
              id\
            }\
        }\
    }';
    superagent
    .post('/api/v1/graph')
    .set('accept', 'json')
    .set('Authorization', tokenString)
    .send({'query': mutation})
    .then(function (res) {
      clearMessage()
      addF.style.display = 'none';
      unF.style.display = 'block';
      input.value = '';
    })
    .catch(function (err) {
        if (err.response) {
            showMessage(err.response.message);
        }
        
    });
  }
  
  function unfriend(){
    isLogin();
    let tokenString = Session.get('token_type') + ' ' + Session.get('token');
    let url = window.location.href.split('/');
    let id = url[url.length-1];
    let addF = document.querySelector('#addFriend');
    let unF = document.querySelector('#unfriend');
    
    let mutation = 'mutation{\
      addFriend(id:"' + id + '"){\
          id\
      }\
    }';     
    superagent
    .post('/api/v1/graph')
    .set('accept', 'json')
    .set('Authorization', tokenString)
    .send({'query': mutation})
    .then(function (res) {
        clearMessage()
        addF.style.display = 'block';
        unF.style.display = 'none';
        input.value = '';
    })
    .catch(function (err) {
        if (err.response) {
            showMessage(err.response.message);
        }
        
    });
  }