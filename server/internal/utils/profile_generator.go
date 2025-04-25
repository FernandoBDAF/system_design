package utils

import (
	"fmt"
	"math/rand"
	"time"

	"github.com/fernandobarroso/profile-service/internal/models"
)

var (
	firstNames = []string{
		"James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
		"William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
		"Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
		"Matthew", "Betty", "Anthony", "Margaret", "Donald", "Sandra", "Mark", "Ashley",
	}

	lastNames = []string{
		"Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
		"Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas",
		"Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White",
		"Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young",
	}

	domains = []string{
		"gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com",
		"example.com", "company.com", "business.com", "tech.com", "mail.com",
	}

	bioTemplates = []string{
		"Passionate %s enthusiast with %d years of experience.",
		"Professional %s expert working in %s.",
		"Dedicated %s specialist focused on %s development.",
		"Experienced %s professional with expertise in %s.",
		"Creative %s innovator specializing in %s solutions.",
	}

	interests = []string{
		"software development", "artificial intelligence", "machine learning",
		"web development", "mobile apps", "cloud computing", "data science",
		"cybersecurity", "blockchain", "IoT", "DevOps", "UI/UX design",
	}

	locations = []string{
		"San Francisco", "New York", "London", "Berlin", "Tokyo",
		"Singapore", "Sydney", "Toronto", "Paris", "Amsterdam",
	}
)

func init() {
	rand.Seed(time.Now().UnixNano())
}

// GenerateRandomProfile creates a new random profile
func GenerateRandomProfile() *models.Profile {
	firstName := firstNames[rand.Intn(len(firstNames))]
	lastName := lastNames[rand.Intn(len(lastNames))]
	domain := domains[rand.Intn(len(domains))]
	email := fmt.Sprintf("%s.%s@%s",
		firstName,
		lastName,
		domain,
	)

	interest1 := interests[rand.Intn(len(interests))]
	interest2 := interests[rand.Intn(len(interests))]
	location := locations[rand.Intn(len(locations))]
	years := rand.Intn(15) + 1

	bioTemplate := bioTemplates[rand.Intn(len(bioTemplates))]
	bio := fmt.Sprintf(bioTemplate, interest1, years)
	if rand.Float32() < 0.5 {
		bio = fmt.Sprintf(bioTemplate, interest1, interest2)
	}

	bio += fmt.Sprintf(" Based in %s.", location)

	now := time.Now()

	return &models.Profile{
		Name:      fmt.Sprintf("%s %s", firstName, lastName),
		Email:     email,
		Bio:       bio,
		ImageURLs: []string{},
		CreatedAt: now,
		UpdatedAt: now,
	}
}
