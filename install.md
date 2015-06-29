sudo apt-get install curl  
curl https://install.meteor.com | sh  
sudo apt-get install git  
git config --global user.name "sjhalasz"  
git config --global user.email "sjhalasz@gmail.com"  
curl -s -O http://github-media-downloads.s3.amazonaws.com/osx/git-credential-osxkeychain  
chmod u+x git-credential-osxkeychain  
sudo mv git-credential-osxkeychain `dirname \`which git\``  
git config --global credential.helper osxkeychain   
git init  
git clone https://github.com/sjhalasz/chess  
meteor create temp  
mv temp/.meteor chess/.  
rm -r temp  
cd chesss  
meteor remove autopublish insecure  
meteor add accounts-password accounts-ui  
meteor add meteorhacks:aggregate  
meteor add underscore  
