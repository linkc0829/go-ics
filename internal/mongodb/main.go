package mongodb

import (
	"context"
	"log"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"github.com/linkc0829/go-ics/pkg/utils"
)

var dbUser, pwd, dbName string

type MongoDB struct{
	session *mongo.Client
	users 	*mongo.Collection
	deleted_users *mongo.Collection
	incomes	*mongo.Collection
	costs	*mongo.Collection
}

func init(){
	dsn = utils.MustGet("MONGO_CONNECTION_DSN")
}

//ConnectDB will build connection to MongoDB Atlas
func ConnectDB() MongoDB{

	client, err := mongo.Connect(context.Background(), options.Client().ApplyURI(dsn))
	if err != nil { 
		log.Fatal(err) 
	}

	err = client.Ping(context.Background(), nil)
	if err != nil {
		log.Fatal(err)
	}
	return MongoDB{
		session: 	client,
		users:		client.Database("ics").Collection("users"),
		deleted_users: client.Database("ics").Collection("deleted_users")
		incomes:	client.Database("ics").Collection("incomes")
		costs:		client.Database("ics").Collection("costs")
	}
}

//CloseDB will dissconnect to MongoDB
func CloseDB(db MongoDB){
	err := db.session.Disconnect(context.Background())
	if err != nil {
		log.Fatal(err)
	}
}